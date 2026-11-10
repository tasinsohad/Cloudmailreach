import emailService from './email-service';
import { emailConst } from '../const/entity-const';

const resendService = {

	async webhooks(c, body) {

		const params = {
			resendEmailId: body.data?.email_id,
			status: emailConst.status.SENT
		};

		if (body.type === 'email.delivered') {
			params.status = emailConst.status.DELIVERED;
			params.message = null;
		}

		if (body.type === 'email.complained') {
			params.status = emailConst.status.COMPLAINED;
			params.message = 'Recipient marked cold email as spam';
		}

		if (body.type === 'email.bounced') {
			let bounce = body.data?.bounce;
			bounce = typeof bounce === 'object' ? JSON.stringify(bounce) : String(bounce || 'Delivery bounced');
			params.status = emailConst.status.BOUNCED;
			params.message = bounce;
		}

		if (body.type === 'email.delivery_delayed') {
			params.status = emailConst.status.DELAYED;
			params.message = null;
		}

		if (body.type === 'email.failed') {
			params.status = emailConst.status.FAILED;
			params.message = body.data?.failed?.reason || 'Failed delivery';
		}

		const emailRow = await emailService.updateEmailStatus(c, params);

		if (!emailRow) {
			console.warn(`resend webhook: unknown email_id ${params.resendEmailId}, type ${body.type}`);
			return;
		}

		// Update outreach_lead table and alert if bounce or spam complaint occurs
		try {
			if (params.status === emailConst.status.BOUNCED || params.status === emailConst.status.COMPLAINED) {
				const leadStatus = params.status === emailConst.status.BOUNCED ? 'bounced' : 'complained';
				const reasonText = params.message || (leadStatus === 'complained' ? 'Recipient marked as spam' : 'Delivery bounced');
				
				await c.env.db.prepare(`
					UPDATE outreach_lead 
					SET status = ?, reply_text = ?, update_time = CURRENT_TIMESTAMP
					WHERE target_email = ? AND status = 'sent'
				`).bind(leadStatus, reasonText, emailRow.toEmail).run();

				// Attempt to send Telegram notification if bot token & chat id are configured
				const settingRow = await c.env.db.prepare(`SELECT tg_bot_token, tg_chat_id, tg_bot_status FROM setting LIMIT 1`).first();
				if (settingRow?.tg_bot_token && settingRow?.tg_chat_id && settingRow?.tg_bot_status !== 0) {
					const alertTitle = leadStatus === 'complained' ? '🚨 <b>[Cloud Mailreach] SPAM COMPLAINT ALERT</b>' : '⚠️ <b>[Cloud Mailreach] BOUNCE ALERT</b>';
					const alertMsg = `${alertTitle}\n\n` +
						`• <b>Sender Inbox:</b> <code>${emailRow.sendEmail}</code>\n` +
						`• <b>Recipient:</b> <code>${emailRow.toEmail}</code>\n` +
						`• <b>Subject:</b> ${emailRow.subject || '(no subject)'}\n` +
						`• <b>Reason:</b> ${reasonText}\n\n` +
						`<i>Check your Deliverability Health dashboard to maintain inbox placement.</i>`;

					await fetch(`https://api.telegram.org/bot${settingRow.tg_bot_token}/sendMessage`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							chat_id: settingRow.tg_chat_id,
							parse_mode: 'HTML',
							text: alertMsg
						})
					}).catch(err => console.warn('Telegram alert failed:', err.message));
				}
			}
		} catch (leadErr) {
			console.warn('Error syncing outreach lead on webhook:', leadErr.message);
		}
	}
};

export default resendService;
