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

		const { token } = params

		const result = await jwtUtils.verifyToken(c, token);

		if (!result) {
			return emailTextTemplate('Access denied')
		}

		const emailRow = await orm(c).select().from(email).where(eq(email.emailId, result.emailId)).get();

		if (emailRow) {

			if (emailRow.content) {
				const { r2Domain } = await settingService.query(c);
				return emailHtmlTemplate(emailRow.content || '', r2Domain)
			} else {
				return emailTextTemplate(emailRow.text || '')
			}

		} else {
			return emailTextTemplate('The email does not exist')
		}

	},

	async sendEmailToBot(c, email) {

		const { tgBotToken, tgChatId, customDomain, tgMsgTo, tgMsgFrom, tgMsgText } = await settingService.query(c);

		if (!tgBotToken || !tgChatId) {
			return;
		}

		const tgChatIds = tgChatId.split(',').map(s => s.trim()).filter(Boolean);
		if (tgChatIds.length === 0) return;

		// Detect if this inbound email matches an outreach lead
		let leadInfo = null;
		if (c.env?.db && email.sendEmail) {
			try {
				const cleanFrom = email.sendEmail.toLowerCase().trim();
				leadInfo = await c.env.db.prepare(`
					SELECT l.lead_id, l.target_email, l.target_name, l.company, l.source, c.name as campaign_name, c.type as campaign_type
					FROM outreach_lead l
					JOIN campaign c ON l.campaign_id = c.campaign_id
					WHERE LOWER(l.target_email) = ?
					ORDER BY l.lead_id DESC LIMIT 1
				`).bind(cleanFrom).first();

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

		const inlineKeyboard = [
			[
				{
					text: '👁️ Quick View',
					web_app: { url: webAppUrl }
				},
				{
					text: '✉️ Reply in Cloud Mail',
					url: directReplyUrl
				}
			]
		];

		if (email.code) {
			inlineKeyboard.push([
				{
					text: email.code,
					copy_text: { text: email.code }
				}
			]);
		}

		let messageText = emailMsgTemplate(email, tgMsgTo, tgMsgFrom, tgMsgText);

		if (leadInfo) {
			const isCareer = leadInfo.campaign_type === 'career_ops';
			const badge = isCareer ? '🎯 JOB PROSPECT REPLY' : '🚀 CLIENT PROSPECT REPLY';
			const alertHeader = `🚨 <b>【${badge}】</b>\n` +
				`<b>Campaign:</b> ${escapeHtml(leadInfo.campaign_name)}\n` +
				`<b>Lead:</b> ${escapeHtml(leadInfo.target_name || leadInfo.target_email)}${leadInfo.company ? ` (${escapeHtml(leadInfo.company)})` : ''}\n` +
				`------------------------------------\n`;
			messageText = alertHeader + messageText;
		}

		await Promise.all(tgChatIds.map(async chatId => {
			try {
				const res = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						chat_id: chatId,
						parse_mode: 'HTML',
						text: messageText,
						reply_markup: {
							inline_keyboard: inlineKeyboard
						}
					})
				});
				if (!res.ok) {
					console.error(`Telegram send failed status: ${res.status} response: ${await res.text()}`);
				}
			} catch (e) {
				console.error(`Telegram send error:`, e.message);
			}
		}));

	}

}

export default telegramService;
