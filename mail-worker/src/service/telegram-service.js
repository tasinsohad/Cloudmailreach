import orm from '../entity/orm';
import email from '../entity/email';
import settingService from './setting-service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);
import { eq } from 'drizzle-orm';
import jwtUtils from '../utils/jwt-utils';
import emailMsgTemplate from '../template/email-msg';
import emailTextTemplate from '../template/email-text';
import emailHtmlTemplate from '../template/email-html';
import verifyUtils from '../utils/verify-utils';
import domainUtils from "../utils/domain-uitls";

function escapeHtml(text = '') {
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

const telegramService = {

	async getEmailContent(c, params) {
		const { emailId } = params;
		const emailRow = await orm(c).select().from(email).where(eq(email.emailId, emailId)).get();
		if (!emailRow) {
			return {
				isHtml: false,
				content: ''
			}
		}
		if (verifyUtils.isHtml(emailRow.content)) {
			return {
				isHtml: true,
				content: emailRow.content
			}
		}
		return {
			isHtml: false,
			content: emailRow.text
		}
	},

	async sendEmailToBot(c, email) {

		const setting = await settingService.query(c);

		const { tgBotToken, tgChatId, customDomain, tgBotStatus } = setting;

		if (!tgBotToken || !tgChatId || !tgBotStatus) {
			return;
		}

		const tgChatIds = tgChatId.split(',').map(s => s.trim()).filter(Boolean);
		if (tgChatIds.length === 0) return;

		// Detect if this inbound email matches an outreach lead (multi-tier matching)
		let leadInfo = null;
		if (c.env?.db && email.sendEmail) {
			try {
				const cleanFrom = email.sendEmail.toLowerCase().trim();
				const fromDomain = cleanFrom.includes('@') ? cleanFrom.split('@')[1] : '';
				const cleanSubj = (email.subject || '').replace(/^(re|fwd|aw|r):\s*/i, '').trim().toLowerCase();

				// Tier 1: Exact sender match
				leadInfo = await c.env.db.prepare(`
					SELECT l.lead_id, l.target_email, l.target_name, l.company, l.source, c.name as campaign_name, c.type as campaign_type
					FROM outreach_lead l
					JOIN campaign c ON l.campaign_id = c.campaign_id
					WHERE LOWER(TRIM(l.target_email)) = ?
					ORDER BY l.lead_id DESC LIMIT 1
				`).bind(cleanFrom).first();

				// Tier 2: Subject thread match (e.g. "Re: Quick intro: Tasin Sohad")
				if (!leadInfo && cleanSubj.length > 8) {
					leadInfo = await c.env.db.prepare(`
						SELECT l.lead_id, l.target_email, l.target_name, l.company, l.source, c.name as campaign_name, c.type as campaign_type
						FROM outreach_lead l
						JOIN campaign c ON l.campaign_id = c.campaign_id
						WHERE l.status IN ('sent', 'queued') AND LOWER(TRIM(l.subject)) LIKE ?
						ORDER BY l.sent_time DESC, l.lead_id DESC LIMIT 1
					`).bind(`%${cleanSubj}%`).first();
				}

				// Tier 3: Domain alias match (e.g. hi@cursor.com replies to careers@cursor.com)
				if (!leadInfo && fromDomain && !['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com'].includes(fromDomain)) {
					leadInfo = await c.env.db.prepare(`
						SELECT l.lead_id, l.target_email, l.target_name, l.company, l.source, c.name as campaign_name, c.type as campaign_type
						FROM outreach_lead l
						JOIN campaign c ON l.campaign_id = c.campaign_id
						WHERE l.status = 'sent' AND LOWER(TRIM(l.target_email)) LIKE ?
						ORDER BY l.sent_time DESC, l.lead_id DESC LIMIT 1
					`).bind(`%@${fromDomain}`).first();
				}

				if (leadInfo) {
					await c.env.db.prepare(`
						UPDATE outreach_lead
						SET status = 'replied', reply_time = CURRENT_TIMESTAMP, reply_email_id = ?
						WHERE lead_id = ?
					`).bind(email.emailId, leadInfo.lead_id).run();
				}
			} catch (e) {
				console.error('Error tracking outreach reply in Telegram notification:', e);
			}
		}

		const jwtToken = await jwtUtils.generateToken(c, { emailId: email.emailId });
		const webAppUrl = customDomain ? `${domainUtils.toOssDomain(customDomain)}/api/telegram/getEmail/${jwtToken}` : 'https://www.cloudflare.com/404';
		const appBaseUrl = customDomain ? domainUtils.toOssDomain(customDomain) : 'https://cloud-mail.sohad-flowtics.workers.dev';
		const directReplyUrl = `${appBaseUrl}/#/inbox?emailId=${email.emailId}&reply=1`;
		const masterInboxUrl = `${appBaseUrl}/#/outreach?tab=inbox`;

		const inlineKeyboard = [
			[
				{
					text: '👁️ Quick View',
					web_app: { url: webAppUrl }
				},
				{
					text: leadInfo ? '💬 Open Master Inbox & Reply' : '✉️ Reply Email',
					url: leadInfo ? masterInboxUrl : directReplyUrl
				}
			]
		];

		const date = dayjs(email.createTime).tz(c.env.time_zone || 'Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss');

		// Rich alert header: highlights if this is a prospect reply
		let alertPrefix = '';
		if (leadInfo) {
			const badge = leadInfo.campaign_type === 'job_hunting' ? '💼 CAREER-OPS (JOBS)' : '🎯 HARVEY (CLIENTS)';
			alertPrefix = `🎉 <b>[PROSPECT REPLY RECEIVED!]</b>\n` +
				`━━━━━━━━━━━━━━━━━━━\n` +
				`📌 <b>Engine:</b> ${badge}\n` +
				`🏢 <b>Company:</b> ${leadInfo.company || 'N/A'}\n` +
				`👤 <b>Contact:</b> ${leadInfo.target_name || leadInfo.target_email}\n` +
				`━━━━━━━━━━━━━━━━━━━\n\n`;
		}

		const fullMsg = alertPrefix + emailMsgTemplate({
			sendEmail: email.sendEmail,
			toEmail: email.toEmail,
			subject: email.subject,
			date: date,
			text: email.text || email.content || ''
		});

		await Promise.all(tgChatIds.map(async chatId => {
			try {
				let sendSuccess = false;
				for (let attempt = 0; attempt < 2; attempt++) {
					try {
						const res = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								chat_id: chatId,
								parse_mode: 'HTML',
								text: fullMsg,
								reply_markup: { inline_keyboard: inlineKeyboard }
							})
						});
						if (res.ok) {
							sendSuccess = true;
							break;
						}
					} catch (fetchErr) {
						if (attempt === 1) throw fetchErr;
						await new Promise(r => setTimeout(r, 600));
					}
				}
				if (!sendSuccess) {
					// Fallback to plain text if HTML parsing fails
					const textFallback = alertPrefix.replace(/<[^>]+>/g, '') + emailTextTemplate({
						sendEmail: email.sendEmail,
						toEmail: email.toEmail,
						subject: email.subject,
						date: date,
						text: email.text || email.content || ''
					});
					await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							chat_id: chatId,
							text: textFallback,
							reply_markup: { inline_keyboard: inlineKeyboard }
						})
					});
				}
			} catch (err) {
				console.error(`Failed to send Telegram message to ${chatId}:`, err);
			}
		}));
	}
};

export default telegramService;
