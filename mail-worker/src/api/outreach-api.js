import app from '../hono/hono';
import userContext from '../security/user-context';
import emailService from '../service/email-service';
import settingService from '../service/setting-service';
import BizError from '../error/biz-error';

// Helper: fetch models from LLM providers
async function fetchProviderModels(provider, apiKey, baseUrl) {
	apiKey = (apiKey || '').trim();
	baseUrl = (baseUrl || '').trim();

	if (provider === 'openai') {
		if (!apiKey) throw new BizError('OpenAI API key is required');
		const res = await fetch('https://api.openai.com/v1/models', {
			headers: { 'Authorization': `Bearer ${apiKey}` }
		});
		if (!res.ok) {
			const err = await res.text();
			throw new BizError(`OpenAI API Error (${res.status}): ${err}`);
		}
		const data = await res.json();
		const list = (data.data || [])
			.filter(m => m.id.startsWith('gpt-') || m.id.startsWith('o1') || m.id.startsWith('o3') || m.id.includes('chat'))
			.map(m => ({ id: m.id, name: m.id }));
		return list.sort((a, b) => a.id.localeCompare(b.id));
	}

	if (provider === 'openrouter') {
		if (!apiKey) throw new BizError('OpenRouter API key is required');
		const res = await fetch('https://openrouter.ai/api/v1/models', {
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'HTTP-Referer': 'https://cloud-mail.sohad-flowtics.workers.dev',
				'X-Title': 'Cloud Mail Outreach'
			}
		});
		if (!res.ok) {
			const err = await res.text();
			throw new BizError(`OpenRouter API Error (${res.status}): ${err}`);
		}
		const data = await res.json();
		return (data.data || []).map(m => ({ id: m.id, name: `${m.name || m.id} (${m.id})` }));
	}

	if (provider === 'anthropic') {
		if (!apiKey) throw new BizError('Anthropic API key is required');
		try {
			const res = await fetch('https://api.anthropic.com/v1/models', {
				headers: {
					'x-api-key': apiKey,
					'anthropic-version': '2023-06-01'
				}
			});
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data.data) && data.data.length > 0) {
					return data.data.map(m => ({ id: m.id, name: m.display_name ? `${m.display_name} (${m.id})` : m.id }));
				}
			}
		} catch (e) {
			console.warn('Anthropic models fetch error, using curated list:', e.message);
		}
		return [
			{ id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Latest - Recommended)' },
			{ id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast & Cost-Efficient)' },
			{ id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Deep Reasoning)' },
			{ id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
			{ id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
		];
	}

	if (provider === 'nvidia_nim') {
		if (!apiKey) throw new BizError('NVIDIA NIM API key is required');
		try {
			const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
				headers: { 'Authorization': `Bearer ${apiKey}` }
			});
			if (res.ok) {
				const data = await res.json();
				const list = (data.data || []).map(m => ({ id: m.id, name: m.id }));
				if (list.length > 0) return list;
			}
		} catch (e) {
			console.warn('NVIDIA NIM models fetch error, using curated list:', e.message);
		}
		return [
			{ id: 'meta/llama-3.1-70b-instruct', name: 'meta/llama-3.1-70b-instruct (Recommended)' },
			{ id: 'meta/llama-3.1-405b-instruct', name: 'meta/llama-3.1-405b-instruct (Flagship 405B)' },
			{ id: 'meta/llama-3.1-8b-instruct', name: 'meta/llama-3.1-8b-instruct (Ultra Fast)' },
			{ id: 'nvidia/nemotron-4-340b-instruct', name: 'nvidia/nemotron-4-340b-instruct' },
			{ id: 'mistralai/mixtral-8x22b-instruct-v0.1', name: 'mistralai/mixtral-8x22b-instruct-v0.1' }
		];
	}

	if (provider === 'google') {
		if (!apiKey) throw new BizError('Google Gemini API key is required');
		try {
			const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
			const res = await fetch(url);
			if (res.ok) {
				const data = await res.json();
				const list = (data.models || [])
					.filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
					.map(m => {
						const id = m.name.replace('models/', '');
						return { id: id, name: `${m.displayName || id} (${id})` };
					});
				if (list.length > 0) return list;
			}
		} catch (e) {
			console.warn('Google Gemini models fetch error, using curated list:', e.message);
		}
		return [
			{ id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Flagship 1M Context)' },
			{ id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fast & Low Cost)' },
			{ id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Next-Gen Preview)' }
		];
	}

	if (provider === 'custom') {
		if (!baseUrl) {
			throw new BizError('Custom LLM requires a Base URL (e.g. https://api.together.xyz/v1 or http://localhost:11434/v1)');
		}
		const cleanBase = baseUrl.replace(/\/+$/, '');
		const targetUrl = cleanBase.endsWith('/models') ? cleanBase : `${cleanBase}/models`;
		const headers = {};
		if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
		try {
			const res = await fetch(targetUrl, { headers });
			if (res.ok) {
				const data = await res.json();
				const items = data.data || data.models || [];
				if (Array.isArray(items) && items.length > 0) {
					return items.map(m => ({ id: m.id || m.name, name: m.name || m.id }));
				}
			}
		} catch (e) {
			console.warn('Custom LLM /models endpoint failed:', e.message);
		}
		return [
			{ id: 'llama3:latest', name: 'llama3:latest (Local / Ollama)' },
			{ id: 'mistral:latest', name: 'mistral:latest (Local / Ollama)' },
			{ id: 'custom-model', name: 'Custom Specified Model' }
		];
	}

	throw new BizError(`Unsupported provider: ${provider}`);
}

// 1. Dashboard summary stats
app.get('/outreach/dashboard', async (c) => {
	const db = c.env.db;

	const [campaignsRes, leadsStatsRes, accountsRes, recentRepliesRes, settingRow, llmConfigsRes] = await Promise.all([
		db.prepare(`SELECT * FROM campaign ORDER BY campaign_id ASC`).all(),
		db.prepare(`
			SELECT 
				COUNT(*) as total_leads,
				SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued_count,
				SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
				SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied_count,
				SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced_count
			FROM outreach_lead
		`).first(),
		db.prepare(`SELECT account_id, email, name, status FROM account WHERE is_del = 0 ORDER BY account_id ASC`).all(),
		db.prepare(`
			SELECT l.lead_id, l.target_email, l.target_name, l.company, l.source, l.sender_email, l.subject, l.reply_time, l.reply_email_id, c.name as campaign_name, c.type as campaign_type
			FROM outreach_lead l
			JOIN campaign c ON l.campaign_id = c.campaign_id
			WHERE l.status = 'replied'
			ORDER BY l.reply_time DESC LIMIT 10
		`).all(),
		db.prepare(`SELECT tg_bot_token, tg_chat_id, tg_bot_status, custom_domain FROM setting LIMIT 1`).first(),
		db.prepare(`SELECT * FROM llm_config ORDER BY config_id ASC`).all()
	]);

	const domains = c.env.domain || [];
	const resendDomains = ['technetocrat.org', 'swiftsuretech.com'];
	const brevoDomains = ['nccwtech.com', 'saiftechnology.com'];

	return c.json({
		code: 200,
		data: {
			campaigns: campaignsRes.results || [],
			stats: leadsStatsRes || { total_leads: 0, queued_count: 0, sent_count: 0, replied_count: 0, bounced_count: 0 },
			accounts: accountsRes.results || [],
			domains: {
				all: domains,
				resend: resendDomains,
				brevo: brevoDomains
			},
			recentReplies: recentRepliesRes.results || [],
			telegram: {
				tgBotToken: settingRow?.tg_bot_token || '',
				tgChatId: settingRow?.tg_chat_id || '',
				tgBotStatus: settingRow?.tg_bot_status ?? 1,
				configured: Boolean(settingRow?.tg_bot_token && settingRow?.tg_chat_id)
			},
			llmConfigs: llmConfigsRes.results || []
		}
	});
});

// 2. Create campaign with optional initial lead list
app.post('/outreach/campaign/create', async (c) => {
	const { name, type, dailyLimit = 25, settings = {}, leads = [] } = await c.req.json();

	if (!name || !name.trim()) {
		throw new BizError('Campaign name is required');
	}

	const campaignType = type || 'service_outreach';
	const settingsJson = typeof settings === 'string' ? settings : JSON.stringify(settings);

	// Insert campaign
	const insertCampRes = await c.env.db.prepare(`
		INSERT INTO campaign (name, type, status, daily_limit, settings)
		VALUES (?, ?, 1, ?, ?)
	`).bind(name.trim(), campaignType, dailyLimit, settingsJson).run();

	// In D1, insert returns meta.last_row_id
	const newCampaignId = insertCampRes.meta?.last_row_id;

	// Insert leads if provided
	let addedLeadsCount = 0;
	if (Array.isArray(leads) && leads.length > 0 && newCampaignId) {
		const stmt = c.env.db.prepare(`
			INSERT INTO outreach_lead 
			(campaign_id, target_email, target_name, company, source, subject, body, status)
			VALUES (?, ?, ?, ?, ?, ?, ?, 'queued')
		`);

		const batch = leads
			.filter(l => l.targetEmail && l.targetEmail.includes('@'))
			.map(l => stmt.bind(
				newCampaignId,
				l.targetEmail.trim(),
				(l.targetName || '').trim(),
				(l.company || '').trim(),
				campaignType === 'job_hunting' ? 'career_ops' : 'harvey',
				(l.subject || `Outreach — ${name}`).trim(),
				(l.body || '').trim()
			));

		if (batch.length > 0) {
			await c.env.db.batch(batch);
			addedLeadsCount = batch.length;
		}
	}

	return c.json({
		code: 200,
		message: `Campaign created successfully with ${addedLeadsCount} queued leads`,
		data: { campaignId: newCampaignId, addedLeadsCount }
	});
});

// 3. Update campaign settings (target roles, ICP, pitch, etc.)
app.post('/outreach/campaign/settings/update', async (c) => {
	const { campaignId, name, dailyLimit, settings } = await c.req.json();

	const settingsJson = typeof settings === 'string' ? settings : JSON.stringify(settings || {});

	await c.env.db.prepare(`
		UPDATE campaign 
		SET name = COALESCE(?, name),
		    daily_limit = COALESCE(?, daily_limit),
		    settings = ?
		WHERE campaign_id = ?
	`).bind(name || null, dailyLimit || null, settingsJson, campaignId).run();

	return c.json({ code: 200, message: 'Campaign settings updated successfully' });
});

// 4. Delete campaign
app.post('/outreach/campaign/delete', async (c) => {
	const { campaignId, deleteLeads = true } = await c.req.json();

	if (deleteLeads) {
		await c.env.db.prepare(`DELETE FROM outreach_lead WHERE campaign_id = ?`).bind(campaignId).run();
	}
	await c.env.db.prepare(`DELETE FROM campaign WHERE campaign_id = ?`).bind(campaignId).run();

	return c.json({ code: 200, message: 'Campaign deleted successfully' });
});

// 5. Toggle campaign active/paused
app.post('/outreach/campaign/toggle', async (c) => {
	const { campaignId, status } = await c.req.json();
	await c.env.db.prepare(
		`UPDATE campaign SET status = ? WHERE campaign_id = ?`
	).bind(status ? 1 : 0, campaignId).run();

	return c.json({ code: 200, message: 'Status updated' });
});

// 6. Update campaign daily limit
app.post('/outreach/campaign/update', async (c) => {
	const { campaignId, dailyLimit } = await c.req.json();
	await c.env.db.prepare(
		`UPDATE campaign SET daily_limit = ? WHERE campaign_id = ?`
	).bind(dailyLimit || 25, campaignId).run();

	return c.json({ code: 200, message: 'Campaign updated' });
});

// 7. List leads with filtering
app.get('/outreach/leads', async (c) => {
	const url = new URL(c.req.url);
	const campaignId = url.searchParams.get('campaignId');
	const status = url.searchParams.get('status');
	const limit = parseInt(url.searchParams.get('limit') || '100', 10);

	let query = `
		SELECT l.*, c.name as campaign_name, c.type as campaign_type 
		FROM outreach_lead l
		JOIN campaign c ON l.campaign_id = c.campaign_id
		WHERE 1=1
	`;
	const params = [];

	if (campaignId) {
		query += ` AND l.campaign_id = ?`;
		params.push(campaignId);
	}
	if (status && status !== 'all') {
		query += ` AND l.status = ?`;
		params.push(status);
	}

	query += ` ORDER BY l.lead_id DESC LIMIT ?`;
	params.push(limit);

	const stmt = c.env.db.prepare(query);
	const res = await (params.length ? stmt.bind(...params) : stmt).all();

	return c.json({ code: 200, data: res.results || [] });
});

// 8. Add leads to queue (called by Harvey, Career-Ops, or Dashboard UI)
app.post('/outreach/lead/add', async (c) => {
	const body = await c.req.json();
	const leads = Array.isArray(body) ? body : [body];

	const stmt = c.env.db.prepare(`
		INSERT INTO outreach_lead 
		(campaign_id, target_email, target_name, company, source, subject, body, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, 'queued')
	`);

	const batch = leads.map(l => stmt.bind(
		l.campaignId || 1,
		l.targetEmail,
		l.targetName || '',
		l.company || '',
		l.source || 'harvey',
		l.subject || '',
		l.body || ''
	));

	await c.env.db.batch(batch);
	return c.json({ code: 200, message: `Added ${leads.length} leads to queue` });
});

// 9. Delete a lead
app.post('/outreach/lead/delete', async (c) => {
	const { leadId } = await c.req.json();
	await c.env.db.prepare(`DELETE FROM outreach_lead WHERE lead_id = ?`).bind(leadId).run();
	return c.json({ code: 200, message: 'Lead deleted' });
});

// 10. Dispatch batch with domain rotation
app.post('/outreach/dispatch-batch', async (c) => {
	const { campaignId, count = 5 } = await c.req.json();

	let leadsStmt;
	if (campaignId) {
		leadsStmt = c.env.db.prepare(`
			SELECT * FROM outreach_lead 
			WHERE campaign_id = ? AND status = 'queued' 
			ORDER BY lead_id ASC LIMIT ?
		`).bind(campaignId, count);
	} else {
		leadsStmt = c.env.db.prepare(`
			SELECT * FROM outreach_lead 
			WHERE status = 'queued' 
			ORDER BY lead_id ASC LIMIT ?
		`).bind(count);
	}

	const leadsRes = await leadsStmt.all();
	const leads = leadsRes.results || [];
	if (leads.length === 0) {
		return c.json({ code: 200, message: 'Queue is empty', sentCount: 0 });
	}

	const accountsRes = await c.env.db.prepare(`
		SELECT account_id, email, name FROM account WHERE is_del = 0 ORDER BY sort ASC
	`).all();
	const accounts = accountsRes.results || [];
	if (accounts.length === 0) {
		throw new BizError('No active inboxes available for sending');
	}

	let sentSuccess = 0;
	let accountIdx = 0;
	let lastError = null;

	for (const lead of leads) {
		const senderAccount = accounts[accountIdx % accounts.length];
		accountIdx++;
		const accountId = senderAccount.account_id || senderAccount.accountId;

		try {
			await emailService.send(c, {
				accountId: accountId,
				receiveEmail: [lead.target_email],
				name: 'Tasin Sohad',
				subject: lead.subject,
				text: lead.body || '',
				content: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #111; line-height: 1.6;">${(lead.body || '').replace(/\n/g, '<br/>')}</div>`,
				sendType: 'new',
				attachments: []
			}, 1);

			await c.env.db.prepare(`
				UPDATE outreach_lead 
				SET status = 'sent', sender_email = ?, sent_time = CURRENT_TIMESTAMP 
				WHERE lead_id = ?
			`).bind(senderAccount.email, lead.lead_id).run();

			sentSuccess++;
		} catch (err) {
			console.error(`Failed sending outreach to ${lead.target_email}:`, err.stack || err.message);
			lastError = err.stack || err.message || String(err);
		}
	}

	return c.json({
		code: 200,
		message: `Dispatched ${sentSuccess} emails across rotated inboxes${lastError ? ' (lastError: ' + lastError + ')' : ''}`,
		sentCount: sentSuccess,
		lastError
	});
});

// 11. LLM: Fetch Models from Provider
app.post('/outreach/llm/fetch-models', async (c) => {
	const { provider, apiKey, baseUrl } = await c.req.json();

	if (!provider) {
		throw new BizError('Provider is required');
	}

	const models = await fetchProviderModels(provider, apiKey, baseUrl);

	// Persist the discovered models and api_key into llm_config
	await c.env.db.prepare(`
		UPDATE llm_config 
		SET api_key = COALESCE(NULLIF(?, ''), api_key),
		    base_url = COALESCE(NULLIF(?, ''), base_url),
		    available_models = ?,
		    updated_time = CURRENT_TIMESTAMP
		WHERE provider = ?
	`).bind(apiKey || '', baseUrl || '', JSON.stringify(models), provider).run();

	return c.json({
		code: 200,
		message: `Found ${models.length} models for ${provider}`,
		models
	});
});

// 12. LLM: Save Provider Config (model selection, api key, active toggle)
app.post('/outreach/llm/save-config', async (c) => {
	const { provider, apiKey, baseUrl, selectedModel, isActive } = await c.req.json();

	if (!provider) {
		throw new BizError('Provider is required');
	}

	if (isActive) {
		// Set all other providers inactive
		await c.env.db.prepare(`UPDATE llm_config SET is_active = 0`).run();
	}

	await c.env.db.prepare(`
		INSERT INTO llm_config (provider, api_key, base_url, selected_model, is_active, updated_time)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(provider) DO UPDATE SET
			api_key = COALESCE(NULLIF(excluded.api_key, ''), llm_config.api_key),
			base_url = excluded.base_url,
			selected_model = excluded.selected_model,
			is_active = excluded.is_active,
			updated_time = CURRENT_TIMESTAMP
	`).bind(
		provider,
		apiKey || '',
		baseUrl || '',
		selectedModel || '',
		isActive ? 1 : 0
	).run();

	return c.json({ code: 200, message: `${provider} configuration saved successfully` });
});

// 13. Update Telegram settings
app.post('/outreach/telegram/update', async (c) => {
	const { tgBotToken, tgChatId } = await c.req.json();

	await c.env.db.prepare(`
		UPDATE setting 
		SET tg_bot_token = ?, tg_chat_id = ?, tg_bot_status = 1
	`).bind((tgBotToken || '').trim(), (tgChatId || '').trim()).run();

	await settingService.refresh(c);

	return c.json({ code: 200, message: 'Telegram settings updated successfully' });
});

// 14. Test Telegram notification
app.post('/outreach/telegram/test', async (c) => {
	const { tgBotToken, tgChatId } = await c.req.json();

	const token = (tgBotToken || '').trim();
	const chatId = (tgChatId || '').trim();

	if (!token || !chatId) {
		throw new BizError('Both Telegram Bot Token and Chat ID are required for testing');
	}

	const appBaseUrl = 'https://cloud-mail.sohad-flowtics.workers.dev';
	const testText = `🤖 <b>[Cloud Mail Outreach Test]</b>\n\n` +
		`✅ Your Telegram notification system is successfully connected!\n\n` +
		`• <b>Active Inboxes:</b> 20 mailboxes\n` +
		`• <b>Connected Domains:</b> technetocrat.org, swiftsuretech.com, nccwtech.com, saiftechnology.com\n` +
		`• <b>Engines:</b> Career-Ops (Jobs) & Harvey (Client Acquisition)\n\n` +
		`When any prospect replies, you'll receive an instant alert here with a direct 1-click reply button!`;

	const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			chat_id: chatId,
			parse_mode: 'HTML',
			text: testText,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🚀 Open Cloud Mail Dashboard',
							url: `${appBaseUrl}/#/outreach`
						}
					]
				]
			}
		})
	});

	if (!res.ok) {
		const err = await res.text();
		throw new BizError(`Telegram API error (${res.status}): ${err}`);
	}

	return c.json({ code: 200, message: 'Test message sent to Telegram successfully!' });
});
