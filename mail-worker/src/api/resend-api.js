import resendService from '../service/resend-service';
import app from '../hono/hono';

// Resend transactional email webhooks
app.post('/webhooks', async (c) => {
	try {
		await resendService.webhooks(c, await c.req.json());
		return c.text('success', 200);
	} catch (e) {
		return c.text(e.message, 500);
	}
});

// Brevo transactional email webhooks (for nccwtech.com & saiftechnology.com)
app.post('/webhooks/brevo', async (c) => {
	try {
		const body = await c.req.json();
		const events = Array.isArray(body) ? body : [body];
		for (const evt of events) {
			const eventType = evt.event; // hard_bounce, soft_bounce, spam, complaint, delivered, invalid_email
			const recipient = evt.email;
			const reason = evt.reason || evt.description || eventType;

			let emailStatus = null;
			let leadStatus = null;
			if (['hard_bounce', 'soft_bounce', 'invalid_email', 'blocked'].includes(eventType)) {
				emailStatus = 3; // BOUNCED
				leadStatus = 'bounced';
			} else if (['spam', 'complaint'].includes(eventType)) {
				emailStatus = 4; // COMPLAINED
				leadStatus = 'complained';
			} else if (eventType === 'delivered') {
				emailStatus = 2; // DELIVERED
			}

			if (emailStatus && recipient) {
				await c.env.db.prepare(`
					UPDATE email 
					SET status = ?, message = ?
					WHERE to_email = ? AND type = 1 AND is_del = 0
				`).bind(emailStatus, String(reason), recipient).run().catch(() => {});

				if (leadStatus) {
					await c.env.db.prepare(`
						UPDATE outreach_lead 
						SET status = ?, reply_text = ?, update_time = CURRENT_TIMESTAMP
						WHERE target_email = ? AND status = 'sent'
					`).bind(leadStatus, String(reason), recipient).run().catch(() => {});
				}
			}
		}
		return c.text('success', 200);
	} catch (e) {
		console.warn('Brevo webhook error:', e.message);
		return c.text(e.message, 500);
	}
});
