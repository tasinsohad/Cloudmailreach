import app from './hono/webs';
import { email } from './email/email';
import userService from './service/user-service';
import verifyRecordService from './service/verify-record-service';
import emailService from './service/email-service';
import r2Service from './service/r2-service';
import oauthService from './service/oauth-service';
import analysisService from './service/analysis-service';
import dayjs from 'dayjs';
import kvConst from './const/kv-const';

export default {
	async fetch(req, env, ctx) {
		const url = new URL(req.url);

		const redirectDomains = ['technetocrat.org', 'swiftsuretech.com', 'nccwtech.com', 'saiftechnology.com'];
		if (redirectDomains.some(d => url.hostname.endsWith(d)) && !url.hostname.startsWith('mail.')) {
			if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/oss/')) {
				return Response.redirect('https://www.corevibeai.com', 301);
			}
		}

		if (url.pathname.startsWith('/api/')) {
			url.pathname = url.pathname.replace('/api', '');
			req = new Request(url.toString(), req);
			return app.fetch(req, env, ctx);
		}

		if (url.pathname.startsWith('/oss/')) {
			const key = url.pathname.slice('/oss/'.length);
			const resp = await r2Service.toObjResp({ env }, key);
			return resp || new Response('Not Found', { status: 404 });
		}

		if (['/static/', '/attachments/'].some(p => url.pathname.startsWith(p))) {
			const resp = await r2Service.toObjResp({ env }, url.pathname.substring(1));
			return resp || new Response('Not Found', { status: 404 });
		}

		return env.assets.fetch(req);
	},
	email: email,
	async scheduled(c, env, ctx) {
		if (c.cron === '*/30 * * * *') {
			await analysisService.refreshEchartsCache({ env });
			return;
		}

		await verifyRecordService.clearRecord({ env });
		await userService.resetDaySendCount({ env });
		await emailService.completeReceiveAll({ env });
		await emailService.autoClean({ env });
		await analysisService.refreshEchartsCache({ env });
		await oauthService.clearNoBindOathUser({ env });

		// Automated cold outreach dispatching (conserves CF free quota with small batched hourly drip)
		try {
			const activeCampaigns = await env.db.prepare(`
				SELECT * FROM campaign WHERE status = 1
			`).all();

			for (const camp of (activeCampaigns.results || [])) {
				const batchSize = Math.max(1, Math.min(5, Math.ceil(camp.daily_limit / 8)));
				const leadsRes = await env.db.prepare(`
					SELECT * FROM outreach_lead 
					WHERE campaign_id = ? AND status = 'queued' 
					ORDER BY lead_id ASC LIMIT ?
				`).bind(camp.campaign_id, batchSize).all();

				const leads = leadsRes.results || [];
				if (leads.length === 0) continue;

				const dateStr = dayjs().format('YYYY-MM-DD');
				const accountsRes = await env.db.prepare(`
					SELECT account_id, email, name, daily_send_limit FROM account WHERE is_del = 0 ORDER BY sort ASC
				`).all();
				const allAccounts = accountsRes.results || [];
				if (allAccounts.length === 0) continue;

				const eligibleAccounts = [];
				for (const acc of allAccounts) {
					const accId = acc.account_id || acc.accountId;
					const accountDailyKey = kvConst.SEND_DAY_COUNT + 'account:' + accId + ':' + dateStr;
					const sentToday = Number(await env.kv.get(accountDailyKey) || 0);
					const limit = acc.daily_send_limit ?? 30;
					if (sentToday < limit) {
						eligibleAccounts.push({ ...acc, accountId: accId, sentToday, limit });
					}
				}
				if (eligibleAccounts.length === 0) continue;

				let accountIdx = 0;
				for (const lead of leads) {
					let sender = null;
					for (let attempt = 0; attempt < eligibleAccounts.length; attempt++) {
						const candidate = eligibleAccounts[accountIdx % eligibleAccounts.length];
						accountIdx++;
						if (candidate.sentToday < candidate.limit) {
							sender = candidate;
							break;
						}
					}
					if (!sender) break;

					const accountId = sender.accountId;
					try {
						await emailService.send({ env }, {
							accountId: accountId,
							receiveEmail: [lead.target_email],
							name: 'Tasin Sohad',
							subject: lead.subject,
							text: lead.body || '',
							content: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #111; line-height: 1.6;">${(lead.body || '').replace(/\n/g, '<br/>')}</div>`,
							sendType: 'new',
							attachments: []
						}, 1);

						sender.sentToday++;

						await env.db.prepare(`
							UPDATE outreach_lead 
							SET status = 'sent', sender_email = ?, sent_time = CURRENT_TIMESTAMP 
							WHERE lead_id = ?
						`).bind(sender.email, lead.lead_id).run();
					} catch (e) {
						console.error(`Scheduled outreach dispatch error for ${lead.target_email}:`, e.message);
					}
				}
			}
		} catch (e) {
			console.error('Error during scheduled outreach drip:', e);
		}
	},
};
