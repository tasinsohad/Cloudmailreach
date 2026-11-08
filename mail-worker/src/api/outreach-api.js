import app from '../hono/hono';
import userContext from '../security/user-context';
import emailService from '../service/email-service';
import settingService from '../service/setting-service';
import BizError from '../error/biz-error';
import dayjs from 'dayjs';
import kvConst from '../const/kv-const';

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

export function getProviderDisplayName(provider) {
	const map = {
		anthropic: 'Anthropic Claude',
		openai: 'OpenAI',
		google: 'Google Gemini',
		nvidia_nim: 'NVIDIA NIM',
		openrouter: 'OpenRouter',
		custom: 'Custom LLM',
		cloudflare_ai: 'Cloudflare Workers AI'
	};
	return map[provider] || provider;
}

export function extractSubjectAndBody(text) {
	if (!text || typeof text !== 'string') return null;
	const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
	try {
		const parsed = JSON.parse(clean);
		if (parsed && parsed.subject && parsed.body) return parsed;
	} catch {}

	const match = clean.match(/\{[\s\S]*\}/);
	if (match) {
		try {
			const parsed = JSON.parse(match[0]);
			if (parsed && parsed.subject && parsed.body) return parsed;
		} catch {}
	}
	return null;
}

export async function executeProviderChat(provider, apiKey, baseUrl, model, systemPrompt, userPrompt, timeoutMs = 12000) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		let res;
		let resultText = '';

		if (provider === 'openai') {
			const modelName = model || 'gpt-4o-mini';
			res = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
				signal: controller.signal,
				body: JSON.stringify({
					model: modelName,
					messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
					temperature: 0.7,
					response_format: { type: 'json_object' }
				})
			});
			if (!res.ok) {
				const errText = await res.text();
				throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 150)}`);
			}
			const data = await res.json();
			resultText = data.choices?.[0]?.message?.content || '';

		} else if (provider === 'anthropic') {
			const modelName = model || 'claude-3-5-sonnet-20241022';
			res = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
					'anthropic-version': '2023-06-01'
				},
				signal: controller.signal,
				body: JSON.stringify({
					model: modelName,
					max_tokens: 450,
					system: systemPrompt,
					messages: [{ role: 'user', content: userPrompt + '\n\nOutput ONLY raw JSON with keys "subject" and "body".' }]
				})
			});
			if (!res.ok) {
				const errText = await res.text();
				throw new Error(`Anthropic HTTP ${res.status}: ${errText.slice(0, 150)}`);
			}
			const data = await res.json();
			resultText = data.content?.[0]?.text || '';

		} else if (provider === 'openrouter') {
			const modelName = model || 'anthropic/claude-3.5-sonnet';
			res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
					'HTTP-Referer': 'https://cloud-mail.sohad-flowtics.workers.dev',
					'X-Title': 'Cloud Mail Outreach'
				},
				signal: controller.signal,
				body: JSON.stringify({
					model: modelName,
					messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
					temperature: 0.7
				})
			});
			if (!res.ok) {
				const errText = await res.text();
				throw new Error(`OpenRouter HTTP ${res.status}: ${errText.slice(0, 150)}`);
			}
			const data = await res.json();
			resultText = data.choices?.[0]?.message?.content || '';

		} else if (provider === 'nvidia_nim') {
			const modelName = model || 'meta/llama-3.1-70b-instruct';
			res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
				signal: controller.signal,
				body: JSON.stringify({
					model: modelName,
					messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
					temperature: 0.7
				})
			});
			if (!res.ok) {
				const errText = await res.text();
				throw new Error(`NVIDIA NIM HTTP ${res.status}: ${errText.slice(0, 150)}`);
			}
			const data = await res.json();
			resultText = data.choices?.[0]?.message?.content || '';

		} else if (provider === 'google') {
			const modelName = model || 'gemini-1.5-flash';
			res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				signal: controller.signal,
				body: JSON.stringify({
					contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}\n\nOutput only raw JSON.` }] }]
				})
			});
			if (!res.ok) {
				const errText = await res.text();
				throw new Error(`Google Gemini HTTP ${res.status}: ${errText.slice(0, 150)}`);
			}
			const data = await res.json();
			resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

		} else if (provider === 'custom') {
			const modelName = model || 'custom';
			const cleanBase = (baseUrl || '').replace(/\/+$/, '');
			res = await fetch(`${cleanBase}/chat/completions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}) },
				signal: controller.signal,
				body: JSON.stringify({
					model: modelName,
					messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
					temperature: 0.7
				})
			});
			if (!res.ok) {
				const errText = await res.text();
				throw new Error(`Custom LLM HTTP ${res.status}: ${errText.slice(0, 150)}`);
			}
			const data = await res.json();
			resultText = data.choices?.[0]?.message?.content || '';
		} else {
			throw new Error(`Unsupported provider: ${provider}`);
		}

		return resultText;
	} finally {
		clearTimeout(timeout);
	}
}

// Autonomous Email Drafting Engine with Multi-Provider Automatic Failover
export async function generateAutonomousEmail(c, lead, campaignSettings = {}, campaignType = 'service_outreach') {
	const targetName = lead.target_name || lead.targetEmail?.split('@')[0] || lead.target_email?.split('@')[0] || 'there';
	const company = lead.company || (lead.target_email || lead.targetEmail || '').split('@')[1] || 'your team';

	let systemPrompt = '';
	let userPrompt = '';

	// Custom System Prompt Resolver (Campaign-level or Global KV)
	let customSystemPrompt = campaignSettings.systemPrompt;
	if (!customSystemPrompt && c.env?.kv) {
		if (campaignType === 'job_hunting') {
			customSystemPrompt = await c.env.kv.get('outreach:system_prompt:job_hunting');
		} else {
			customSystemPrompt = await c.env.kv.get('outreach:system_prompt:service_outreach');
		}
		if (!customSystemPrompt) {
			customSystemPrompt = await c.env.kv.get('outreach:system_prompt:global');
		}
	}

	if (campaignType === 'job_hunting') {
		const roles = campaignSettings.targetRoles || 'Senior Full-Stack Engineer / AI Solutions Architect';
		const portfolio = campaignSettings.portfolioUrl || 'github.com/tasinsohad | linkedin.com/in/tasinsohad';
		const resume = campaignSettings.resumeUrl || 'https://drive.google.com/file/d/1jVtmUEEYGtgmsMp0jGzZQX0QslTVGX4a/view?usp=sharing';
		const pitch = campaignSettings.pitchFocus || 'I build autonomous AI agents and production web applications with vibe coding and AI toolchains, shipping systems in days.';

		if (customSystemPrompt && customSystemPrompt.trim()) {
			systemPrompt = customSystemPrompt
				.replaceAll('{{targetName}}', targetName)
				.replaceAll('{{company}}', company)
				.replaceAll('{{roles}}', roles)
				.replaceAll('{{portfolio}}', portfolio)
				.replaceAll('{{portfolioUrl}}', portfolio)
				.replaceAll('{{resume}}', resume)
				.replaceAll('{{resumeUrl}}', resume)
				.replaceAll('{{pitch}}', pitch);
			if (!systemPrompt.includes('"subject"') || !systemPrompt.includes('"body"')) {
				systemPrompt += '\n\nIMPORTANT: Output your entire response ONLY as a valid JSON object: {"subject": "...", "body": "..."}';
			}
		} else {
			systemPrompt = `You are an elite, natural human outreach AI representing Tasin Sohad for engineering & AI roles. Write a compelling, concise (under 80 words), high-converting cold email to a tech recruiter or hiring manager. Never sound like a generic template. Format response ONLY as valid JSON: {"subject": "...", "body": "..."}`;
		}
		userPrompt = `Recipient: ${targetName} at ${company}.
Target Roles: ${roles}
Portfolio: ${portfolio}
Resume Link: ${resume}
Value Proposition: ${pitch}
Draft a warm, sharp message asking if they are exploring senior engineers/builders with strong AI delivery speed. Output JSON only.`;
	} else {
		// Harvey B2B Client Acquisition
		const icp = campaignSettings.icpIndustries || 'B2B SaaS, Logistics & Tech Startups';
		const offering = campaignSettings.serviceOffering || 'Takes AI implementation, custom LLM workflows, automated data pipelines, and internal tools off engineering backlogs.';
		const booking = campaignSettings.bookingUrl || 'https://drive.google.com/file/d/1jVtmUEEYGtgmsMp0jGzZQX0QslTVGX4a/view?usp=sharing';

		if (customSystemPrompt && customSystemPrompt.trim()) {
			systemPrompt = customSystemPrompt
				.replaceAll('{{targetName}}', targetName)
				.replaceAll('{{company}}', company)
				.replaceAll('{{icp}}', icp)
				.replaceAll('{{offering}}', offering)
				.replaceAll('{{booking}}', booking)
				.replaceAll('{{bookingUrl}}', booking);
			if (!systemPrompt.includes('"subject"') || !systemPrompt.includes('"body"')) {
				systemPrompt += '\n\nIMPORTANT: Output your entire response ONLY as a valid JSON object: {"subject": "...", "body": "..."}';
			}
		} else {
			systemPrompt = `You are Harvey, an autonomous B2B client acquisition AI for Tasin Sohad. Write a tailored, executive-level cold outreach email (under 75 words) that solves an engineering backlog problem. Avoid spammy sales fluff. Format response ONLY as valid JSON: {"subject": "...", "body": "..."}`;
		}
		userPrompt = `Prospect: ${targetName} at ${company} (ICP: ${icp}).
Offering: ${offering}
Booking/Review Link: ${booking}
Draft a high-conversion, professional cold email proposing a brief 10-minute discovery call to see if offloading AI workflow pipelines makes sense. Output JSON only.`;
	}

	let parsed = null;
	let activeProvider = 'Cloudflare AI';
	let activeModel = '@cf/meta/llama-3.1-8b-instruct-fast';
	const failoverChain = [];

	// Fetch all enabled providers from DB ordered by priority (1 = highest priority)
	let activeLlms = [];
	try {
		const rows = await c.env.db.prepare(`
			SELECT * FROM llm_config 
			WHERE is_active = 1 
			ORDER BY priority ASC, config_id ASC
		`).all();
		activeLlms = rows?.results || [];
	} catch (dbErr) {
		console.error('[Failover Engine] Could not load llm_config:', dbErr.message);
	}

	// Sequential Failover Execution Loop
	for (const llm of activeLlms) {
		const pName = getProviderDisplayName(llm.provider);
		const mName = llm.selected_model || 'default';
		const key = (llm.api_key || '').trim();

		// Skip if non-custom provider has no API key
		if (!key && llm.provider !== 'custom') {
			continue;
		}

		try {
			console.log(`[Failover Engine] Attempting generation with ${pName} (${mName})...`);
			const startTime = Date.now();
			const text = await executeProviderChat(
				llm.provider,
				key,
				llm.base_url,
				llm.selected_model,
				systemPrompt,
				userPrompt,
				12000
			);
			const duration = Date.now() - startTime;
			const extracted = extractSubjectAndBody(text);

			if (extracted) {
				parsed = extracted;
				activeProvider = pName;
				activeModel = mName;
				console.log(`[Failover Engine] Succeeded with ${pName} (${mName}) in ${duration}ms`);
				break; // Success! Terminate failover loop
			} else {
				throw new Error('Provider response could not be parsed into valid subject & body JSON');
			}
		} catch (err) {
			console.warn(`[Failover Engine] Provider ${pName} failed: ${err.message}. Switching to next provider in failover chain...`);
			failoverChain.push({
				provider: pName,
				model: mName,
				error: err.message || 'Request failed'
			});
		}
	}

	// Fallback to Cloudflare Workers AI if all user providers failed or none active
	if (!parsed && c.env.ai) {
		try {
			console.log('[Failover Engine] Triggering Cloudflare Workers AI fallback...');
			const cfStartTime = Date.now();
			const cfResult = await c.env.ai.run('@cf/meta/llama-3.1-8b-instruct-fast', {
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: userPrompt + '\n\nOutput only valid JSON with "subject" and "body" keys.' }
				],
				temperature: 0.6,
				max_tokens: 350
			});
			const cfDuration = Date.now() - cfStartTime;
			const cfText = typeof cfResult === 'string' ? cfResult : cfResult?.response || '';
			parsed = extractSubjectAndBody(cfText);
			if (parsed) {
				activeProvider = 'Cloudflare Workers AI';
				activeModel = '@cf/meta/llama-3.1-8b-instruct-fast';
				console.log(`[Failover Engine] Succeeded with Cloudflare Workers AI in ${cfDuration}ms`);
			}
		} catch (aiErr) {
			console.error('[Failover Engine] Cloudflare AI fallback error:', aiErr.message);
			failoverChain.push({
				provider: 'Cloudflare Workers AI',
				model: '@cf/meta/llama-3.1-8b-instruct-fast',
				error: aiErr.message
			});
		}
	}

	// Contextual safe fallback template if everything failed
	if (!parsed || !parsed.subject || !parsed.body) {
		if (campaignType === 'job_hunting') {
			parsed = {
				subject: `Quick intro: Tasin Sohad — Senior Engineering / AI`,
				body: `Hi ${targetName},\n\nI came across ${company} and wanted to reach out directly. I build autonomous AI agents, LLM pipelines, and scalable web apps.\n\nMy portfolio & resume: https://drive.google.com/file/d/1jVtmUEEYGtgmsMp0jGzZQX0QslTVGX4a/view?usp=sharing\n\nWould love to connect if you are exploring strong technical talent.\n\nBest,\nTasin Sohad`
			};
		} else {
			parsed = {
				subject: `AI implementations & internal automation for ${company}`,
				body: `Hi ${targetName},\n\nI build custom LLM workflows, automated pipelines, and agentic internal tools that take engineering backlogs off tech teams.\n\nCould we do a brief 10-minute chat this week to see if we can accelerate any pending AI initiatives for ${company}?\n\nOverview & work: https://drive.google.com/file/d/1jVtmUEEYGtgmsMp0jGzZQX0QslTVGX4a/view?usp=sharing\n\nBest,\nTasin Sohad`
			};
		}
	}

	return {
		subject: parsed.subject,
		body: parsed.body,
		provider: activeProvider,
		model: activeModel,
		failoverChain
	};
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
		db.prepare(`SELECT account_id, email, name, status, daily_send_limit FROM account WHERE is_del = 0 ORDER BY account_id ASC`).all(),
		db.prepare(`
			SELECT l.lead_id, l.target_email, l.target_name, l.company, l.source, l.sender_email, l.subject, l.reply_time, l.reply_email_id, c.name as campaign_name, c.type as campaign_type
			FROM outreach_lead l
			JOIN campaign c ON l.campaign_id = c.campaign_id
			WHERE l.status = 'replied'
			ORDER BY l.reply_time DESC LIMIT 10
		`).all(),
		db.prepare(`SELECT tg_bot_token, tg_chat_id, tg_bot_status, custom_domain FROM setting LIMIT 1`).first(),
		db.prepare(`SELECT * FROM llm_config ORDER BY priority ASC, config_id ASC`).all()
	]);

	const domains = c.env.domain || [];
	const resendDomains = ['technetocrat.org', 'swiftsuretech.com'];
	const brevoDomains = ['nccwtech.com', 'saiftechnology.com'];

	const dateStr = dayjs().format('YYYY-MM-DD');
	const rawAccounts = accountsRes.results || [];
	const accountsWithStats = await Promise.all(rawAccounts.map(async (acc) => {
		const accId = acc.account_id || acc.accountId;
		const accountDailyKey = kvConst.SEND_DAY_COUNT + 'account:' + accId + ':' + dateStr;
		const sentToday = Number(await c.env.kv.get(accountDailyKey) || 0);
		const limit = acc.daily_send_limit ?? 30;
		return {
			...acc,
			daily_send_limit: limit,
			sent_today: sentToday,
			remaining: Math.max(0, limit - sentToday)
		};
	}));

	const autoPilotVal = await c.env.kv.get('outreach:autopilot');
	const autoPilotEnabled = autoPilotVal === '1';

	const [jobPromptVal, clientPromptVal, globalPromptVal] = await Promise.all([
		c.env.kv.get('outreach:system_prompt:job_hunting'),
		c.env.kv.get('outreach:system_prompt:service_outreach'),
		c.env.kv.get('outreach:system_prompt:global')
	]);

	const systemPrompts = {
		job_hunting: jobPromptVal || `You are an elite, natural human outreach AI representing Tasin Sohad for engineering & AI roles. Write a compelling, concise (under 80 words), high-converting cold email to a tech recruiter or hiring manager. Never sound like a generic template. Format response ONLY as valid JSON: {"subject": "...", "body": "..."}`,
		service_outreach: clientPromptVal || `You are Harvey, an autonomous B2B client acquisition AI for Tasin Sohad. Write a tailored, executive-level cold outreach email (under 75 words) that solves an engineering backlog problem. Avoid spammy sales fluff. Format response ONLY as valid JSON: {"subject": "...", "body": "..."}`,
		global: globalPromptVal || ''
	};

	return c.json({
		code: 200,
		data: {
			autopilot: autoPilotEnabled,
			campaigns: campaignsRes.results || [],
			stats: leadsStatsRes || { total_leads: 0, queued_count: 0, sent_count: 0, replied_count: 0, bounced_count: 0 },
			accounts: accountsWithStats,
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
			systemPrompts,
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

	const dateStr = dayjs().format('YYYY-MM-DD');
	const accountsRes = await c.env.db.prepare(`
		SELECT account_id, email, name, daily_send_limit FROM account WHERE is_del = 0 ORDER BY sort ASC
	`).all();
	const allAccounts = accountsRes.results || [];
	if (allAccounts.length === 0) {
		throw new BizError('No active inboxes available for sending');
	}

	// Filter inboxes with daily limit remaining
	const eligibleAccounts = [];
	for (const acc of allAccounts) {
		const accId = acc.account_id || acc.accountId;
		const accountDailyKey = kvConst.SEND_DAY_COUNT + 'account:' + accId + ':' + dateStr;
		const sentToday = Number(await c.env.kv.get(accountDailyKey) || 0);
		const limit = acc.daily_send_limit ?? 30;
		if (sentToday < limit) {
			eligibleAccounts.push({
				...acc,
				accountId: accId,
				sentToday,
				limit
			});
		}
	}

	if (eligibleAccounts.length === 0) {
		return c.json({
			code: 429,
			message: 'All inboxes have reached their daily sending limits for today. Increase the limits or wait for tomorrow.',
			sentCount: 0
		});
	}

	let sentSuccess = 0;
	let accountIdx = 0;
	let lastError = null;

	for (const lead of leads) {
		// Find next account that still has remaining quota
		let senderAccount = null;
		for (let attempt = 0; attempt < eligibleAccounts.length; attempt++) {
			const candidate = eligibleAccounts[accountIdx % eligibleAccounts.length];
			accountIdx++;
			if (candidate.sentToday < candidate.limit) {
				senderAccount = candidate;
				break;
			}
		}

		if (!senderAccount) {
			console.log('All eligible inboxes exhausted quota during batch.');
			break;
		}

		const accountId = senderAccount.accountId;

		try {
			const isAutoPilot = (await c.env.kv.get('outreach:autopilot')) === '1';
			let emailSubject = lead.subject;
			let emailBody = lead.body;

			// If Auto-Pilot is ON or if lead has no custom body, autonomously draft personalized email
			if (isAutoPilot || !emailBody || emailBody.trim().length === 0) {
				const campRow = await c.env.db.prepare(`SELECT type, settings FROM campaign WHERE campaign_id = ?`).bind(lead.campaign_id).first();
				let settingsObj = {};
				try { settingsObj = JSON.parse(campRow?.settings || '{}'); } catch {}
				const generated = await generateAutonomousEmail(c, lead, settingsObj, campRow?.type || 'service_outreach');
				emailSubject = generated.subject;
				emailBody = generated.body;
			}

			await emailService.send(c, {
				accountId: accountId,
				receiveEmail: [lead.target_email],
				name: 'Tasin Sohad',
				subject: emailSubject,
				text: emailBody || '',
				content: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #111; line-height: 1.6;">${(emailBody || '').replace(/\n/g, '<br/>')}</div>`,
				sendType: 'new',
				attachments: []
			}, 1);

			senderAccount.sentToday++;

			await c.env.db.prepare(`
				UPDATE outreach_lead 
				SET status = 'sent', subject = ?, body = ?, sender_email = ?, sent_time = CURRENT_TIMESTAMP 
				WHERE lead_id = ?
			`).bind(emailSubject, emailBody, senderAccount.email, lead.lead_id).run();

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
		data: {
			models
		},
		models
	});
});

// 12. LLM: Save Provider Config (model selection, api key, active toggle, failover priority)
app.post('/outreach/llm/save-config', async (c) => {
	const { provider, apiKey, baseUrl, selectedModel, isActive, priority } = await c.req.json();

	if (!provider) {
		throw new BizError('Provider is required');
	}

	await c.env.db.prepare(`
		INSERT INTO llm_config (provider, api_key, base_url, selected_model, is_active, priority, updated_time)
		VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(provider) DO UPDATE SET
			api_key = COALESCE(NULLIF(excluded.api_key, ''), llm_config.api_key),
			base_url = excluded.base_url,
			selected_model = excluded.selected_model,
			is_active = excluded.is_active,
			priority = COALESCE(excluded.priority, llm_config.priority, 10),
			updated_time = CURRENT_TIMESTAMP
	`).bind(
		provider,
		apiKey || '',
		baseUrl || '',
		selectedModel || '',
		isActive ? 1 : 0,
		typeof priority === 'number' ? priority : 10
	).run();

	return c.json({ 
		code: 200, 
		message: `${provider} configuration saved successfully`,
		data: { provider, selectedModel, isActive }
	});
});

// 12b. LLM: Toggle Active Status in Failover Pool
app.post('/outreach/llm/toggle-active', async (c) => {
	const { provider, isActive } = await c.req.json();
	if (!provider) throw new BizError('Provider is required');

	await c.env.db.prepare(`
		UPDATE llm_config 
		SET is_active = ?, updated_time = CURRENT_TIMESTAMP 
		WHERE provider = ?
	`).bind(isActive ? 1 : 0, provider).run();

	return c.json({ 
		code: 200, 
		message: `${provider} is now ${isActive ? 'active in failover pool' : 'disabled'}`,
		data: { provider, isActive }
	});
});

// 12c. LLM: Reorder Failover Chain Priorities
app.post('/outreach/llm/reorder', async (c) => {
	const { providers } = await c.req.json();
	if (Array.isArray(providers)) {
		for (let i = 0; i < providers.length; i++) {
			await c.env.db.prepare(`
				UPDATE llm_config 
				SET priority = ?, updated_time = CURRENT_TIMESTAMP 
				WHERE provider = ?
			`).bind(i + 1, providers[i]).run();
		}
	}
	return c.json({ 
		code: 200, 
		message: 'Failover priority order updated',
		data: { providers }
	});
});

// 12d. LLM: Live Connection & Latency Test for Provider
app.post('/outreach/llm/test-provider', async (c) => {
	const { provider, apiKey, baseUrl, selectedModel } = await c.req.json();
	if (!provider) throw new BizError('Provider is required');

	let key = (apiKey || '').trim();
	let base = (baseUrl || '').trim();
	let model = (selectedModel || '').trim();

	if (!key && provider !== 'custom') {
		const existing = await c.env.db.prepare(`SELECT * FROM llm_config WHERE provider = ?`).bind(provider).first();
		if (existing && existing.api_key) {
			key = existing.api_key.trim();
			base = base || existing.base_url;
			model = model || existing.selected_model;
		}
	}

	if (!key && provider !== 'custom') {
		return c.json({ 
			code: 400, 
			success: false, 
			error: 'No API key configured for this provider yet.',
			data: { success: false, error: 'No API key configured for this provider yet.' }
		});
	}

	const startTime = Date.now();
	try {
		const result = await executeProviderChat(
			provider,
			key,
			base,
			model,
			'You are a status verification bot. Answer with valid JSON: {"status": "ok", "message": "Connection verified successfully"}',
			'Verify connectivity and response time in valid JSON.',
			10000
		);
		const latency = Date.now() - startTime;
		return c.json({
			code: 200,
			success: true,
			latencyMs: latency,
			message: `Connected successfully (${latency}ms latency)!`,
			preview: (result || '').slice(0, 150),
			data: {
				success: true,
				latencyMs: latency,
				message: `Connected successfully (${latency}ms latency)!`,
				preview: (result || '').slice(0, 150)
			}
		});
	} catch (err) {
		const latency = Date.now() - startTime;
		return c.json({
			code: 200,
			success: false,
			latencyMs: latency,
			error: err.message || 'Connection test failed',
			data: {
				success: false,
				latencyMs: latency,
				error: err.message || 'Connection test failed'
			}
		});
	}
});

// 12e. Save Custom AI System Prompts
app.post('/outreach/system-prompts/save', async (c) => {
	const { job_hunting, service_outreach, global } = await c.req.json();
	if (job_hunting !== undefined) {
		await c.env.kv.put('outreach:system_prompt:job_hunting', (job_hunting || '').trim());
	}
	if (service_outreach !== undefined) {
		await c.env.kv.put('outreach:system_prompt:service_outreach', (service_outreach || '').trim());
	}
	if (global !== undefined) {
		await c.env.kv.put('outreach:system_prompt:global', (global || '').trim());
	}
	return c.json({
		code: 200,
		message: 'AI system prompts saved successfully',
		data: { job_hunting, service_outreach, global }
	});
});

// 12f. Reset System Prompts to High-Converting Defaults
app.post('/outreach/system-prompts/reset', async (c) => {
	const { type } = await c.req.json();
	if (type === 'job_hunting' || type === 'all') {
		await c.env.kv.delete('outreach:system_prompt:job_hunting');
	}
	if (type === 'service_outreach' || type === 'all') {
		await c.env.kv.delete('outreach:system_prompt:service_outreach');
	}
	if (type === 'global' || type === 'all') {
		await c.env.kv.delete('outreach:system_prompt:global');
	}
	return c.json({
		code: 200,
		message: 'System prompts reset to default',
		data: {
			job_hunting: `You are an elite, natural human outreach AI representing Tasin Sohad for engineering & AI roles. Write a compelling, concise (under 80 words), high-converting cold email to a tech recruiter or hiring manager. Never sound like a generic template. Format response ONLY as valid JSON: {"subject": "...", "body": "..."}`,
			service_outreach: `You are Harvey, an autonomous B2B client acquisition AI for Tasin Sohad. Write a tailored, executive-level cold outreach email (under 75 words) that solves an engineering backlog problem. Avoid spammy sales fluff. Format response ONLY as valid JSON: {"subject": "...", "body": "..."}`,
			global: ''
		}
	});
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

// 15. Update daily sending limit for single inbox
app.post('/outreach/inbox/update-limit', async (c) => {
	const { accountId, dailyLimit } = await c.req.json();
	if (!accountId || dailyLimit === undefined || dailyLimit === null) {
		throw new BizError('Account ID and daily limit are required');
	}
	const limitNum = Math.max(0, parseInt(dailyLimit, 10));
	await c.env.db.prepare(`
		UPDATE account SET daily_send_limit = ? WHERE account_id = ?
	`).bind(limitNum, accountId).run();

	return c.json({ code: 200, message: `Updated daily limit to ${limitNum} emails/day` });
});

// 16. Batch update daily sending limit for all inboxes (or filtered by domain)
app.post('/outreach/inbox/batch-limit', async (c) => {
	const { dailyLimit, domain } = await c.req.json();
	if (dailyLimit === undefined || dailyLimit === null) {
		throw new BizError('Daily limit is required');
	}
	const limitNum = Math.max(0, parseInt(dailyLimit, 10));
	if (domain) {
		await c.env.db.prepare(`
			UPDATE account SET daily_send_limit = ? WHERE is_del = 0 AND email LIKE ?
		`).bind(limitNum, `%@${domain}`).run();
	} else {
		await c.env.db.prepare(`
			UPDATE account SET daily_send_limit = ? WHERE is_del = 0
		`).bind(limitNum).run();
	}

	return c.json({ code: 200, message: `Successfully updated daily limit to ${limitNum} emails/day` });
});

// 17. Auto-Pilot: Toggle Master Autonomous Mode
app.post('/outreach/autopilot/toggle', async (c) => {
	const { enabled } = await c.req.json();
	const val = enabled ? '1' : '0';
	await c.env.kv.put('outreach:autopilot', val);
	return c.json({ 
		code: 200, 
		message: `Outreach Auto-Pilot is now ${enabled ? 'ACTIVATED' : 'PAUSED'}`, 
		autopilot: Boolean(enabled) 
	});
});

// 18. Auto-Pilot: Live Test & Preview Generation
app.post('/outreach/autopilot/preview', async (c) => {
	const body = await c.req.json();
	const targetEmail = body.targetEmail || 'alex@stripe.com';
	const targetName = body.targetName || 'Alex';
	const company = body.company || 'Stripe';
	const campaignType = body.campaignType || 'service_outreach';
	const settings = body.settings || {};
	if (body.systemPrompt) {
		settings.systemPrompt = body.systemPrompt;
	}

	const result = await generateAutonomousEmail(c, { target_email: targetEmail, target_name: targetName, company }, settings, campaignType);

	return c.json({
		code: 200,
		data: result
	});
});
