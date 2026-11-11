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
				'X-Title': 'Cloud Mailreach Outreach'
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

export function getProviderCandidateModels(provider, selectedModel) {
	const fallbackMap = {
		openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
		openrouter: [
			'anthropic/claude-3.5-sonnet',
			'openai/gpt-4o-mini',
			'deepseek/deepseek-chat',
			'meta-llama/llama-3.1-70b-instruct',
			'google/gemini-flash-1.5'
		],
		anthropic: [
			'claude-3-5-sonnet-20241022',
			'claude-3-5-haiku-20241022',
			'claude-3-haiku-20240307',
			'claude-3-sonnet-20240229'
		],
		google: [
			'gemini-1.5-flash',
			'gemini-1.5-pro',
			'gemini-2.0-flash-exp',
			'gemini-1.5-flash-8b'
		],
		nvidia_nim: [
			'meta/llama-3.1-70b-instruct',
			'meta/llama-3.1-8b-instruct',
			'mistralai/mixtral-8x22b-instruct-v0.1',
			'nvidia/nemotron-4-340b-instruct'
		],
		cloudflare_ai: [
			'@cf/meta/llama-3.1-8b-instruct-fast',
			'@cf/meta/llama-3.1-70b-instruct',
			'@cf/mistral/mistral-7b-instruct-v0.2',
			'@cf/qwen/qwen1.5-14b-chat-awq'
		],
		custom: ['llama3:latest', 'mistral:latest', 'custom-model']
	};

	const fallbacks = fallbackMap[provider] || [];
	const candidateList = [];

	if (selectedModel && typeof selectedModel === 'string' && selectedModel.trim()) {
		candidateList.push(selectedModel.trim());
	}

	for (const fb of fallbacks) {
		if (!candidateList.includes(fb)) {
			candidateList.push(fb);
		}
	}

	return candidateList.length > 0 ? candidateList : ['default'];
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
					'X-Title': 'Cloud Mailreach Outreach'
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
		const resume = '';
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
			systemPrompt = `You are Tasin Sohad, a Senior Full-Stack & Autonomous AI Systems Engineer writing directly to a hiring manager, CTO, or tech recruiter. Write a hyper-personalized, high-converting cold email (strictly under 80 words) that stands out from generic applicants.

CORE RULES:
1. Always write in the first person as ME (Tasin Sohad: 'I', 'my'). Never talk about Tasin in the third person.
2. Skip pleasantries. Start immediately with a sharp technical hook tailored to {{company}}.
3. Reference real strengths: high-throughput full-stack systems (TypeScript, React/Vue, Node/Go), serverless edge compute (Cloudflare Workers, distributed DBs), and autonomous AI agent workflows.
4. Structure with 3 short paragraphs separated by blank lines (\\n\\n). Under 80 words.
5. Soft CTA: Ask if they are open to a 2-minute demo / GitHub repo walkthrough, or a brief 5-minute chat.
6. Sign off: Best,\\nTasin Sohad

IMPORTANT: Output your entire response ONLY as a valid JSON object: {"subject": "...", "body": "..."}`;
		}
		userPrompt = `Recipient: ${targetName} at ${company}.
Target Roles: ${roles}
Portfolio: ${portfolio}
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
			systemPrompt = `You are Tasin Sohad, a technical consultant and engineering partner writing directly to a Founder, CEO, CTO, or VP of Engineering at {{company}}. Write a tailored, executive-level cold outreach email (strictly under 75 words) that addresses an engineering, workflow, or AI automation backlog bottleneck.

CORE RULES:
1. Always write as ME (Tasin Sohad). Speak peer-to-peer. Never say 'Tasin Sohad steps in as...' or talk in the third person.
2. Avoid AI cliches and sales fluff. Sound like a sharp engineer sending a thoughtful note.
3. Reference {{company}}'s product or technical bottleneck and how I solved a similar bottleneck with measurable impact.
4. Structure with 3 short paragraphs separated by blank lines (\\n\\n). Under 75 words.
5. Soft CTA: 'Worth a quick 2-bullet breakdown of how we tackled this?' or 'Open to a brief 5-minute chat?'
6. Sign off: Best,\\nTasin Sohad

IMPORTANT: Output your entire response ONLY as a valid JSON object: {"subject": "...", "body": "..."}`;
		}
		userPrompt = `Prospect: ${targetName} at ${company} (ICP: ${icp}).
Offering: ${offering}
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

	// Sequential Two-Tier Failover Execution Loop:
	// Tier 1: Try candidate models from the same API provider
	// Tier 2: If all models for that provider fail, switch to the next active provider in the failover chain
	let generationSucceeded = false;

	for (const llm of activeLlms) {
		const pName = getProviderDisplayName(llm.provider);
		const key = (llm.api_key || '').trim();

		// Skip if non-custom provider has no API key
		if (!key && llm.provider !== 'custom') {
			continue;
		}

		// Retrieve candidate models: user's selected_model FIRST, followed by fallbacks for this same API
		const candidateModels = getProviderCandidateModels(llm.provider, llm.selected_model);

		for (const mName of candidateModels) {
			try {
				console.log(`[Failover Engine] Attempting generation with ${pName} -> model "${mName}"...`);
				const startTime = Date.now();
				const text = await executeProviderChat(
					llm.provider,
					key,
					llm.base_url,
					mName,
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
					generationSucceeded = true;
					console.log(`[Failover Engine] Succeeded with ${pName} (model: ${mName}) in ${duration}ms`);
					break; // Success! Break model loop
				} else {
					throw new Error('Provider response could not be parsed into valid subject & body JSON');
				}
			} catch (err) {
				console.warn(`[Failover Engine] Model "${mName}" on ${pName} failed: ${err.message}. Trying next candidate model on same API...`);
				failoverChain.push({
					provider: pName,
					model: mName,
					error: err.message || 'Request failed'
				});
			}
		}

		if (generationSucceeded) {
			break; // Succeeded! Terminate provider failover loop
		} else {
			console.warn(`[Failover Engine] All candidate models exhausted for ${pName}. Switching to next provider in failover pool...`);
		}
	}

	// Fallback to Cloudflare Workers AI with internal model fallback
	if (!parsed && c.env.ai) {
		const cfModels = [
			'@cf/meta/llama-3.1-8b-instruct-fast',
			'@cf/meta/llama-3.1-70b-instruct',
			'@cf/mistral/mistral-7b-instruct-v0.2'
		];
		for (const cfModel of cfModels) {
			try {
				console.log(`[Failover Engine] Triggering Cloudflare Workers AI fallback with model "${cfModel}"...`);
				const cfStartTime = Date.now();
				const cfResult = await c.env.ai.run(cfModel, {
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
					activeModel = cfModel;
					console.log(`[Failover Engine] Succeeded with Cloudflare Workers AI (${cfModel}) in ${cfDuration}ms`);
					break;
				}
			} catch (aiErr) {
				console.error(`[Failover Engine] Cloudflare AI model "${cfModel}" error:`, aiErr.message);
				failoverChain.push({
					provider: 'Cloudflare Workers AI',
					model: cfModel,
					error: aiErr.message
				});
			}
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

// -----------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------
// Live MX Domain Validation via Cloudflare DNS-over-HTTPS
// -----------------------------------------------------------------------------------------
export async function verifyDomainMx(domain) {
	if (!domain || !domain.includes('.')) return false;
	const cleanDomain = domain.toLowerCase().trim();
	if (['gmail.com', 'google.com', 'outlook.com', 'microsoft.com', 'yahoo.com', 'apple.com', 'meta.com', 'stripe.com', 'cursor.com'].includes(cleanDomain)) {
		return true;
	}
	try {
		const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${cleanDomain}&type=MX`, {
			headers: { 'Accept': 'application/dns-json' }
		});
		if (res.ok) {
			const data = await res.json();
			return Array.isArray(data.Answer) && data.Answer.some(a => a.type === 15);
		}
	} catch (e) {}
	return false;
}

// -----------------------------------------------------------------------------------------
// Real-World Live Job Discovery Engine (Jobicy, RemoteOK, Hacker News "Who is Hiring")
// -----------------------------------------------------------------------------------------
export async function fetchRealLiveJobs() {
	const realJobs = [];

	// Source 1: Hacker News "Who is Hiring" Live Monthly Thread
	try {
		const userRes = await fetch('https://hacker-news.firebaseio.com/v0/user/whoishiring.json');
		if (userRes.ok) {
			const user = await userRes.json();
			const latestPostId = user.submitted?.[0];
			if (latestPostId) {
				const postRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${latestPostId}.json`);
				const post = await postRes.json();
				const kids = (post.kids || []).slice(0, 35);
				for (const kid of kids) {
					try {
						const commentRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${kid}.json`);
						const c = await commentRes.json();
						const text = (c.text || '').replace(/<[^>]+>/g, ' ');
						const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))/);
						if (emailMatch) {
							const email = emailMatch[1].toLowerCase();
							const domain = emailMatch[2].toLowerCase();
							const firstLine = text.split('\n')[0] || '';
							const companyMatch = firstLine.split('|')[0] || '';
							const company = companyMatch.trim().slice(0, 40) || domain.split('.')[0];
							realJobs.push({
								targetEmail: email,
								targetName: 'Hiring Team',
								company: company,
								role: 'Senior Software / AI Engineer',
								source: 'hn_whoishiring'
							});
						}
					} catch {}
				}
			}
		}
	} catch (e) {
		console.warn('[Real Job Scout] HN feed error:', e.message);
	}

	// Source 2: Jobicy Remote Engineering Jobs API
	try {
		const jRes = await fetch('https://jobicy.com/api/v2/remote-jobs?count=25&industry=engineering');
		if (jRes.ok) {
			const jData = await jRes.json();
			for (const item of (jData.jobs || [])) {
				const company = item.companyName;
				const role = item.jobTitle;
				if (company) {
					const cleanComp = company.toLowerCase().replace(/[^a-z0-9]/g, '');
					realJobs.push({
						targetEmail: `careers@${cleanComp}.com`,
						targetName: `${company} Talent Team`,
						company: company,
						role: role,
						source: 'jobicy',
						jobUrl: item.url
					});
				}
			}
		}
	} catch (e) {
		console.warn('[Real Job Scout] Jobicy error:', e.message);
	}

	// Source 3: RemoteOK API
	try {
		const rRes = await fetch('https://remoteok.com/api', {
			headers: { 'User-Agent': 'CloudMailreach/1.0' }
		});
		if (rRes.ok) {
			const rData = await rRes.json();
			const devJobs = (Array.isArray(rData) ? rData : []).filter(j => j.id && j.company).slice(0, 20);
			for (const item of devJobs) {
				const company = item.company;
				const role = item.position;
				if (company) {
					const cleanComp = company.toLowerCase().replace(/[^a-z0-9]/g, '');
					realJobs.push({
						targetEmail: `jobs@${cleanComp}.com`,
						targetName: `${company} Hiring`,
						company: company,
						role: role,
						source: 'remote_ok',
						jobUrl: item.url
					});
				}
			}
		}
	} catch (e) {
		console.warn('[Real Job Scout] RemoteOK error:', e.message);
	}

	return realJobs;
}

// -----------------------------------------------------------------------------------------
// Autonomous AI & Real-World Opportunity Scout (Career-Ops & Harvey)
// Discovers verified, live hiring opportunities and B2B clients with mandatory MX validation
// -----------------------------------------------------------------------------------------
export async function scoutOpportunities(c, type = 'service_outreach', count = 20, isDeep = true) {
	const db = c.env.db;
	const campaignType = type === 'job_hunting' ? 'job_hunting' : 'service_outreach';

	// Get campaign settings
	const camp = await db.prepare(
		`SELECT * FROM campaign WHERE type = ? ORDER BY campaign_id ASC LIMIT 1`
	).bind(campaignType).first();

	let settings = {};
	if (camp && camp.settings) {
		try { settings = typeof camp.settings === 'string' ? JSON.parse(camp.settings) : camp.settings; } catch {}
	}
	const campaignId = camp?.campaign_id || (campaignType === 'job_hunting' ? 1 : 2);

	let scoutedLeads = [];

	// For Career-Ops: fetch REAL live postings from Jobicy, RemoteOK, and Hacker News
	if (campaignType === 'job_hunting') {
		try {
			const liveJobs = await fetchRealLiveJobs();
			if (liveJobs.length > 0) {
				scoutedLeads.push(...liveJobs);
				console.log(`[Real Job Scout] Discovered ${liveJobs.length} real live job postings across HN, Jobicy, and RemoteOK.`);
			}
		} catch (liveErr) {
			console.warn('[Real Job Scout] Live feeds failed, falling back to verified seed intelligence:', liveErr.message);
		}
	}

	// Curated Deep Market Intelligence Seed Banks (Verified tech companies with active mail servers)
	const deepJobReservoir = [
		{ targetEmail: 'talent@modal.com', targetName: 'Modal Talent Team', company: 'Modal Labs', role: 'AI Cloud Systems Engineer', source: 'career_ops' },
		{ targetEmail: 'careers@langchain.dev', targetName: 'LangChain Recruiting', company: 'LangChain', role: 'Autonomous Agent Engineer', source: 'career_ops' },
		{ targetEmail: 'jobs@replicate.com', targetName: 'Replicate Team', company: 'Replicate', role: 'Full-Stack Model Integrations', source: 'career_ops' },
		{ targetEmail: 'hiring@vapi.ai', targetName: 'Vapi AI Team', company: 'Vapi', role: 'Voice AI Infrastructure Engineer', source: 'career_ops' },
		{ targetEmail: 'jobs@cerebras.net', targetName: 'Cerebras Recruiting', company: 'Cerebras Systems', role: 'AI Inference Systems Engineer', source: 'career_ops' },
		{ targetEmail: 'talent@posthog.com', targetName: 'PostHog Talent', company: 'PostHog', role: 'Full-Stack Product Engineer', source: 'career_ops' },
		{ targetEmail: 'careers@supabase.com', targetName: 'Supabase Hiring', company: 'Supabase', role: 'Developer Platform Engineer', source: 'career_ops' },
		{ targetEmail: 'jobs@together.ai', targetName: 'Together AI Talent', company: 'Together AI', role: 'LLM Systems Engineer', source: 'career_ops' },
		{ targetEmail: 'talent@elevenlabs.io', targetName: 'ElevenLabs People', company: 'ElevenLabs', role: 'AI Audio Solutions Engineer', source: 'career_ops' },
		{ targetEmail: 'careers@anyscale.com', targetName: 'Anyscale Recruiting', company: 'Anyscale', role: 'Distributed AI Compute Engineer', source: 'career_ops' },
		{ targetEmail: 'hiring@pinecone.io', targetName: 'Pinecone Talent', company: 'Pinecone', role: 'Vector Search Systems Engineer', source: 'career_ops' },
		{ targetEmail: 'careers@cohere.com', targetName: 'Cohere People Team', company: 'Cohere', role: 'Enterprise LLM Solutions Architect', source: 'career_ops' },
		{ targetEmail: 'talent@mistral.ai', targetName: 'Mistral AI Team', company: 'Mistral AI', role: 'AI Developer Platform Engineer', source: 'career_ops' },
		{ targetEmail: 'jobs@runpod.io', targetName: 'RunPod Hiring', company: 'RunPod', role: 'GPU Cloud Software Engineer', source: 'career_ops' },
		{ targetEmail: 'hiring@groq.com', targetName: 'Groq Talent Team', company: 'Groq', role: 'LPU Cloud Solutions Engineer', source: 'career_ops' },
		{ targetEmail: 'careers@fireworks.ai', targetName: 'Fireworks AI People', company: 'Fireworks AI', role: 'Model Serving Infrastructure Engineer', source: 'career_ops' }
	];

	const deepClientReservoir = [
		{ targetEmail: 'engineering@resend.com', targetName: 'Zeno Rocha', company: 'Resend', role: 'VP Engineering', source: 'harvey' },
		{ targetEmail: 'founders@cal.com', targetName: 'Peer Richelsen', company: 'Cal.com', role: 'Co-Founder', source: 'harvey' },
		{ targetEmail: 'product@dub.co', targetName: 'Steven Tey', company: 'Dub.co', role: 'Founder & CEO', source: 'harvey' },
		{ targetEmail: 'team@mintlify.com', targetName: 'Han Wang', company: 'Mintlify', role: 'Founder & CEO', source: 'harvey' },
		{ targetEmail: 'founders@trigger.dev', targetName: 'Matt Aitken', company: 'Trigger.dev', role: 'Founder', source: 'harvey' },
		{ targetEmail: 'engineering@inngest.com', targetName: 'Dan Farrelly', company: 'Inngest', role: 'CTO', source: 'harvey' },
		{ targetEmail: 'team@raycast.com', targetName: 'Thomas Paul Mann', company: 'Raycast', role: 'CEO', source: 'harvey' },
		{ targetEmail: 'founders@clerk.com', targetName: 'Colin Sidoti', company: 'Clerk', role: 'CEO', source: 'harvey' },
		{ targetEmail: 'team@loops.so', targetName: 'Chris Frantz', company: 'Loops', role: 'Founder', source: 'harvey' },
		{ targetEmail: 'founders@knock.app', targetName: 'Sam Seely', company: 'Knock', role: 'CEO', source: 'harvey' },
		{ targetEmail: 'product@unkey.com', targetName: 'James Perkins', company: 'Unkey', role: 'Founder', source: 'harvey' },
		{ targetEmail: 'engineering@upstash.com', targetName: 'Enes Akar', company: 'Upstash', role: 'CEO', source: 'harvey' },
		{ targetEmail: 'founders@tinybird.co', targetName: 'Jorge Gomez Sancha', company: 'Tinybird', role: 'CEO', source: 'harvey' },
		{ targetEmail: 'team@plain.com', targetName: 'Matt Henderson', company: 'Plain', role: 'CEO', source: 'harvey' },
		{ targetEmail: 'founders@attio.com', targetName: 'Nicolas Sharp', company: 'Attio', role: 'CEO', source: 'harvey' },
		{ targetEmail: 'tech@liveblocks.io', targetName: 'Steven Fabre', company: 'Liveblocks', role: 'CEO', source: 'harvey' },
		{ targetEmail: 'founders@polar.sh', targetName: 'Birk Jernstrom', company: 'Polar', role: 'CEO', source: 'harvey' },
		{ targetEmail: 'founders@openphone.com', targetName: 'Mahyar Raissi', company: 'OpenPhone', role: 'CEO', source: 'harvey' },
		{ targetEmail: 'tech@daily.co', targetName: 'Kwin Kramer', company: 'Daily.co', role: 'CEO', source: 'harvey' }
	];

	const reservoir = campaignType === 'job_hunting' ? deepJobReservoir : deepClientReservoir;
	for (const item of reservoir) {
		if (!scoutedLeads.some(l => (l.targetEmail || '').toLowerCase() === item.targetEmail.toLowerCase())) {
			scoutedLeads.push(item);
		}
	}

	// Filter and validate every lead's MX records before queuing
	const validLeads = [];
	for (const lead of scoutedLeads) {
		if (!lead.targetEmail || !lead.targetEmail.includes('@')) continue;
		const domain = lead.targetEmail.split('@')[1];
		if (!domain) continue;

		// Verify MX records via Cloudflare DNS to guarantee deliverability
		const hasMx = await verifyDomainMx(domain);
		if (hasMx) {
			validLeads.push(lead);
		} else {
			console.warn(`[Deliverability Gate] Dropped invalid domain with NO MX records: ${lead.targetEmail} (${lead.company})`);
		}
		if (validLeads.length >= count) break;
	}

	const addedLeads = [];
	for (const lead of validLeads) {
		const email = lead.targetEmail.trim().toLowerCase();
		const existing = await db.prepare(
			`SELECT lead_id FROM outreach_lead WHERE target_email = ? LIMIT 1`
		).bind(email).first();

		if (!existing) {
			const name = (lead.targetName || email.split('@')[0] || '').trim();
			const company = (lead.company || email.split('@')[1] || '').trim();
			const source = lead.source || (campaignType === 'job_hunting' ? 'career_ops' : 'harvey');

			const tzInfo = detectLeadCountryAndTimezone({ targetEmail: email, company, role: lead.role });
			await db.prepare(`
				INSERT INTO outreach_lead 
				(campaign_id, target_email, target_name, company, source, country, timezone, subject, body, status)
				VALUES (?, ?, ?, ?, ?, ?, ?, '', '', 'queued')
			`).bind(campaignId, email, name, company, source, tzInfo.country, tzInfo.timezone).run();

			addedLeads.push({ targetEmail: email, targetName: name, company, role: lead.role || '', source });
		}
	}

	return {
		scouted: validLeads.length,
		added: addedLeads.length,
		leads: addedLeads
	};
}

export function detectLeadCountryAndTimezone(lead) {
	if (lead.timezone && lead.country) {
		return { country: lead.country, timezone: lead.timezone };
	}

	const email = (lead.targetEmail || lead.target_email || '').toLowerCase().trim();
	const company = (lead.company || '').toLowerCase().trim();

	// 1. Domain TLD matching
	if (email.endsWith('.uk') || email.endsWith('.co.uk')) {
		return { country: 'United Kingdom', timezone: 'Europe/London' };
	}
	if (email.endsWith('.de')) {
		return { country: 'Germany', timezone: 'Europe/Berlin' };
	}
	if (email.endsWith('.fr')) {
		return { country: 'France', timezone: 'Europe/Paris' };
	}
	if (email.endsWith('.ca')) {
		return { country: 'Canada', timezone: 'America/Toronto' };
	}
	if (email.endsWith('.au') || email.endsWith('.com.au')) {
		return { country: 'Australia', timezone: 'Australia/Sydney' };
	}
	if (email.endsWith('.sg')) {
		return { country: 'Singapore', timezone: 'Asia/Singapore' };
	}
	if (email.endsWith('.in') || email.endsWith('.co.in')) {
		return { country: 'India', timezone: 'Asia/Kolkata' };
	}
	if (email.endsWith('.nl')) {
		return { country: 'Netherlands', timezone: 'Europe/Amsterdam' };
	}
	if (email.endsWith('.ch')) {
		return { country: 'Switzerland', timezone: 'Europe/Zurich' };
	}
	if (email.endsWith('.jp') || email.endsWith('.co.jp')) {
		return { country: 'Japan', timezone: 'Asia/Tokyo' };
	}
	if (email.endsWith('.se')) {
		return { country: 'Sweden', timezone: 'Europe/Stockholm' };
	}

	// 2. Known European tech companies
	const euCompanies = ['mistral', 'deepmind', 'hopin', 'revolut', 'monzo', 'wise', 'personio', 'synthesia', 'delivery hero'];
	if (euCompanies.some(c => company.includes(c))) {
		if (company.includes('mistral') || company.includes('personio')) {
			return { country: 'France (CET)', timezone: 'Europe/Paris' };
		}
		return { country: 'United Kingdom', timezone: 'Europe/London' };
	}

	// 3. Silicon Valley & US West tech startups
	const usWestCompanies = ['modal', 'langchain', 'replicate', 'vapi', 'cerebras', 'posthog', 'supabase', 'together', 'fireworks', 'scale ai', 'bland ai', 'cal.com', 'clerk', 'openphone', 'raycast', 'resend', 'dub', 'pinecone', 'anyscale'];
	if (usWestCompanies.some(c => company.includes(c))) {
		return { country: 'United States (Pacific)', timezone: 'America/Los_Angeles' };
	}

	// 4. US East Coast tech startups
	const usEastCompanies = ['anthropic', 'datadog', 'mongodb', 'cockroach', 'ramen', 'ramp', 'hugging'];
	if (usEastCompanies.some(c => company.includes(c))) {
		return { country: 'United States (Eastern)', timezone: 'America/New_York' };
	}

	// 5. Default B2B US Eastern time (standard business corridor)
	return { country: 'United States', timezone: 'America/New_York' };
}

export function getRecipientLocalTime(timezone = 'America/New_York') {
	try {
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			hour12: false,
			weekday: 'short',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
		const parts = formatter.formatToParts(new Date());
		const getPart = (type) => parts.find(p => p.type === type)?.value;
		const hour = parseInt(getPart('hour') || '12', 10);
		const minute = parseInt(getPart('minute') || '0', 10);
		const weekday = getPart('weekday') || 'Wed';
		return {
			hour,
			minute,
			weekday,
			timeStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
			isWeekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday)
		};
	} catch (e) {
		const now = new Date();
		const hour = (now.getUTCHours() - 5 + 24) % 24;
		return {
			hour,
			minute: now.getUTCMinutes(),
			weekday: 'Wed',
			timeStr: `${String(hour).padStart(2, '0')}:00`,
			isWeekday: true
		};
	}
}

export function isWithinPreferableWindow(timezone = 'America/New_York', options = {}) {
	const startHour = options.windowStartHour ?? 9;    // 9:00 AM
	const endHour = options.windowEndHour ?? 17;        // 5:00 PM (17:00)
	const weekdaysOnly = options.weekdaysOnly ?? true;  // Skip weekends

	const local = getRecipientLocalTime(timezone);

	if (weekdaysOnly && !local.isWeekday) {
		return {
			allowed: false,
			reason: `Weekend in ${timezone} (${local.weekday}) - holding for Monday morning`,
			localTime: local.timeStr,
			weekday: local.weekday,
			timezone
		};
	}

	const isTimeOk = (local.hour >= startHour && local.hour < endHour);
	if (!isTimeOk) {
		return {
			allowed: false,
			reason: `Outside business hours in ${timezone} (${local.timeStr} ${local.weekday}, optimal: ${startHour}:00 - ${endHour}:00)`,
			localTime: local.timeStr,
			weekday: local.weekday,
			timezone
		};
	}

	return {
		allowed: true,
		reason: `In optimal window (${local.timeStr} ${local.weekday} in ${timezone})`,
		localTime: local.timeStr,
		weekday: local.weekday,
		timezone
	};
}

export function getHumanDelayMs(mode = 'human_natural', customMin, customMax) {
	let min = 30;
	let max = 60;
	if (mode === 'human_cautious') {
		min = 60;
		max = 120;
	} else if (mode === 'human_fast') {
		min = 15;
		max = 30;
	}
	if (typeof customMin === 'number' && typeof customMax === 'number' && customMax >= customMin) {
		min = customMin;
		max = customMax;
	}
	const sec = Math.floor(Math.random() * (max - min + 1)) + min;
	return sec * 1000;
}

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function executeFullAutoOutreachCycle(c, options = {}) {
	const env = c.env;
	const db = env.db;
	const report = {
		timestamp: new Date().toISOString(),
		jobsDiscovered: 0,
		clientsDiscovered: 0,
		dispatched: 0,
		errors: []
	};

	let config = {
		enabled: true,
		schedule: 'twice_daily',
		searchDepth: 'deep',
		delayMode: 'human_natural',
		minDelaySeconds: 30,
		maxDelaySeconds: 60,
		target: 'both',
		batchSize: 6
	};
	try {
		const rawConfig = await env.kv.get('outreach:automode:config');
		if (rawConfig) {
			config = { ...config, ...JSON.parse(rawConfig) };
		}
	} catch (e) {}

	const targetMode = options.target || config.target || 'both';
	const batchSize = Math.max(1, Math.min(25, options.batchSize || config.batchSize || 6));
	const deepCount = Math.max(10, Math.min(30, options.deepCount || 20));

	// 1. Autonomous Deep Opportunity Discovery: Conduct exhaustive scan across jobs & B2B clients
	try {
		if (targetMode === 'both' || targetMode === 'jobs') {
			const queuedJobsRes = await db.prepare(
				`SELECT COUNT(*) as cnt FROM outreach_lead WHERE status = 'queued' AND campaign_id = 1`
			).first();
			// Proactively discover fresh live jobs whenever buffer is under 30 leads or on deep cycle
			if ((queuedJobsRes?.cnt || 0) < 30 || options.isDeepSearch) {
				const scoutRes = await scoutOpportunities(c, 'job_hunting', deepCount, true);
				report.jobsDiscovered = scoutRes.added || 0;
			}
		}

		if (targetMode === 'both' || targetMode === 'clients') {
			const queuedClientsRes = await db.prepare(
				`SELECT COUNT(*) as cnt FROM outreach_lead WHERE status = 'queued' AND campaign_id = 2`
			).first();
			if ((queuedClientsRes?.cnt || 0) < 30 || options.isDeepSearch) {
				const scoutRes = await scoutOpportunities(c, 'service_outreach', deepCount, true);
				report.clientsDiscovered = scoutRes.added || 0;
			}
		}
	} catch (scoutErr) {
		report.errors.push(`Deep Scouting: ${scoutErr.message}`);
	}

	// 2. Autonomous AI Personalization & Send
	try {
		const allQueuedRes = await db.prepare(`
			SELECT * FROM outreach_lead 
			WHERE status = 'queued' 
			ORDER BY lead_id ASC LIMIT 50
		`).all();

		const allQueued = allQueuedRes.results || [];
		const eligibleLeads = [];
		const heldLeads = [];

		for (const lead of allQueued) {
			const tzInfo = detectLeadCountryAndTimezone(lead);
			const targetTz = lead.timezone || tzInfo.timezone;
			const windowCheck = isWithinPreferableWindow(targetTz, {
				windowStartHour: config.windowStartHour || 9,
				windowEndHour: config.windowEndHour || 17,
				weekdaysOnly: config.weekdaysOnly !== false
			});

			if (options.ignoreTimeWindow || windowCheck.allowed) {
				eligibleLeads.push({ ...lead, tzInfo, windowCheck });
			} else {
				heldLeads.push({ ...lead, tzInfo, windowCheck });
			}
		}

		if (eligibleLeads.length === 0 && heldLeads.length > 0) {
			console.log(`[Country Time Gate] All ${heldLeads.length} queued leads are currently outside local country business hours. Holding until optimal morning window (09:00 - 17:00).`);
			report.heldCount = heldLeads.length;
			report.heldReason = `Holding ${heldLeads.length} leads until recipient country business hours (09:00 - 17:00 local time).`;
		}

		const leads = eligibleLeads.slice(0, batchSize);
		if (leads.length > 0) {
			const dateStr = dayjs().format('YYYY-MM-DD');
			const accountsRes = await db.prepare(`
				SELECT account_id, email, name, daily_send_limit FROM account WHERE is_del = 0 ORDER BY sort ASC
			`).all();
			const allAccounts = accountsRes.results || [];

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

			if (eligibleAccounts.length > 0) {
				const delayMode = options.delayMode || config.delayMode || 'human_natural';
				const minDelay = options.minDelaySeconds ?? config.minDelaySeconds;
				const maxDelay = options.maxDelaySeconds ?? config.maxDelaySeconds;
				let accountIndex = 0;

				const sendSingleLead = async (lead) => {
					let sender = null;
					for (let i = 0; i < eligibleAccounts.length; i++) {
						const candidate = eligibleAccounts[accountIndex % eligibleAccounts.length];
						accountIndex++;
						if (candidate.sentToday < candidate.limit) {
							sender = candidate;
							break;
						}
					}
					if (!sender) return false;

					try {
						const campRow = await db.prepare(
							`SELECT type, settings FROM campaign WHERE campaign_id = ?`
						).bind(lead.campaign_id).first();
						let settingsObj = {};
						try { settingsObj = JSON.parse(campRow?.settings || '{}'); } catch {}

						const generated = await generateAutonomousEmail(c, lead, settingsObj, campRow?.type || 'service_outreach');
						const emailSubject = generated.subject;
						const emailBody = generated.body;

						const isCareerOps = (campRow?.type === 'job_hunting' || lead.campaign_id === 1);
						await emailService.send(c, {
							accountId: sender.accountId,
							receiveEmail: [lead.target_email],
							name: 'Tasin Sohad',
							subject: emailSubject,
							text: emailBody || '',
							content: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #111; line-height: 1.6;">${(emailBody || '').replace(/\n/g, '<br/>')}</div>`,
							sendType: 'new',
							outreachSource: isCareerOps ? 'career_ops' : 'harvey',
							outreachCampaign: isCareerOps ? 'Career-Ops (Jobs)' : 'Harvey (Clients)',
							attachments: []
						}, 1);

						sender.sentToday++;
						await db.prepare(`
							UPDATE outreach_lead 
							SET status = 'sent', subject = ?, body = ?, sender_email = ?, sent_time = CURRENT_TIMESTAMP 
							WHERE lead_id = ?
						`).bind(emailSubject, emailBody, sender.email, lead.lead_id).run();

						report.dispatched++;
						return true;
					} catch (sendErr) {
						report.errors.push(`Send to ${lead.target_email}: ${sendErr.message}`);
						return false;
					}
				};

				// Send first lead immediately
				await sendSingleLead(leads[0]);

				// Sequentially drip remaining leads with human-like delays to prevent blasting
				const remainingLeads = leads.slice(1);
				if (remainingLeads.length > 0) {
					const dripRemaining = async () => {
						for (const rLead of remainingLeads) {
							const delayMs = getHumanDelayMs(delayMode, minDelay, maxDelay);
							console.log(`[Human Delay] Pausing for ${(delayMs / 1000).toFixed(1)}s before sending next email to mimic natural human typing...`);
							await sleep(delayMs);
							await sendSingleLead(rLead);
						}
					};

					const executionCtx = c.executionCtx;
					if (executionCtx && typeof executionCtx.waitUntil === 'function') {
						executionCtx.waitUntil(dripRemaining());
					} else {
						await dripRemaining();
					}
				}
			}
		}
	} catch (dispatchErr) {
		report.errors.push(`Dispatch: ${dispatchErr.message}`);
	}

	report.status = report.errors.length === 0 ? 'success' : (report.dispatched > 0 ? 'partial' : 'failed');
	const heldInfo = report.heldCount ? ` (${report.heldReason})` : '';
	report.message = `Auto Cycle: Discovered ${report.jobsDiscovered} jobs, ${report.clientsDiscovered} clients. Dispatched ${report.dispatched} emails${heldInfo}.`;

	try {
		await env.kv.put('outreach:automode:last_run', JSON.stringify(report));
	} catch (e) {}

	return report;
}


// 1. Dashboard summary stats with Per-Inbox Bounce Rate & Deliverability Tracking
app.get('/outreach/dashboard', async (c) => {
	const db = c.env.db;

	const [campaignsRes, leadsStatsRes, accountsRes, recentRepliesRes, settingRow, llmConfigsRes, emailStatsRes, leadSendersRes] = await Promise.all([
		db.prepare(`SELECT * FROM campaign ORDER BY campaign_id ASC`).all(),
		db.prepare(`
			SELECT 
				COUNT(*) as total_leads,
				COALESCE(SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END), 0) as queued_count,
				COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) as sent_count,
				COALESCE(SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END), 0) as replied_count,
				COALESCE(SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END), 0) as bounced_count
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
		db.prepare(`SELECT * FROM llm_config ORDER BY priority ASC, config_id ASC`).all(),
		db.prepare(`
			SELECT 
				LOWER(TRIM(send_email)) as send_email, 
				COUNT(*) as total_sent, 
				COALESCE(SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END), 0) as delivered_count, 
				COALESCE(SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END), 0) as bounced_count, 
				COALESCE(SUM(CASE WHEN status = 4 THEN 1 ELSE 0 END), 0) as complained_count,
				COALESCE(SUM(CASE WHEN status = 6 THEN 1 ELSE 0 END), 0) as failed_count
			FROM email 
			WHERE type = 1 AND is_del = 0 
			GROUP BY LOWER(TRIM(send_email))
		`).all().catch(() => ({ results: [] })),
		db.prepare(`
			SELECT 
				LOWER(TRIM(sender_email)) as sender_email, 
				COUNT(*) as total_leads_sent, 
				COALESCE(SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END), 0) as replied_count, 
				COALESCE(SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END), 0) as bounced_count 
			FROM outreach_lead 
			WHERE status IN ('sent', 'replied', 'bounced') AND sender_email IS NOT NULL AND sender_email != ''
			GROUP BY LOWER(TRIM(sender_email))
		`).all().catch(() => ({ results: [] }))
	]);

	const domains = c.env.domain || [];
	const resendDomains = ['technetocrat.org', 'swiftsuretech.com'];
	const brevoDomains = ['nccwtech.com', 'saiftechnology.com'];

	const dateStr = dayjs().format('YYYY-MM-DD');
	const rawAccounts = accountsRes.results || [];
	const emailStatsMap = new Map((emailStatsRes?.results || []).map(r => [(r.send_email || '').toLowerCase().trim(), r]));
	const leadStatsMap = new Map((leadSendersRes?.results || []).map(r => [(r.sender_email || '').toLowerCase().trim(), r]));

	const accountsWithStats = await Promise.all(rawAccounts.map(async (acc) => {
		const accId = acc.account_id || acc.accountId;
		const accountDailyKey = kvConst.SEND_DAY_COUNT + 'account:' + accId + ':' + dateStr;
		const sentToday = Number(await c.env.kv.get(accountDailyKey) || 0);
		const limit = acc.daily_send_limit ?? 30;

		const emailKey = (acc.email || '').toLowerCase().trim();
		const eStats = emailStatsMap.get(emailKey) || {};
		const lStats = leadStatsMap.get(emailKey) || {};

		const totalSent = Math.max(Number(eStats.total_sent || 0), Number(lStats.total_leads_sent || 0));
		const deliveredCount = Number(eStats.delivered_count || 0);
		const bouncedCount = Math.max(Number(eStats.bounced_count || 0), Number(lStats.bounced_count || 0));
		const complainedCount = Number(eStats.complained_count || 0);
		const repliedCount = Number(lStats.replied_count || 0);

		// Calculate bounce rate %
		const bounceRate = totalSent > 0 ? Number(((bouncedCount / totalSent) * 100).toFixed(1)) : 0.0;
		const replyRate = totalSent > 0 ? Number(((repliedCount / totalSent) * 100).toFixed(1)) : 0.0;

		// Deliverability Health Score calculation (0 - 100)
		let healthScore = 100;
		if (totalSent > 0) {
			if (bounceRate > 5.0) {
				healthScore -= Math.min(65, Math.round(30 + (bounceRate - 5) * 8));
			} else if (bounceRate > 2.0) {
				healthScore -= Math.min(30, Math.round(10 + (bounceRate - 2) * 6));
			} else if (bounceRate > 0) {
				healthScore -= Math.min(10, Math.round(bounceRate * 4));
			}

			if (complainedCount > 0) {
				healthScore -= Math.min(50, complainedCount * 25);
			}

			if (totalSent >= 25 && repliedCount === 0 && bouncedCount === 0) {
				healthScore -= 5;
			}
		}
		healthScore = Math.max(10, Math.min(100, healthScore));

		let healthStatus = 'pristine';
		let spamRisk = 'low';
		if (totalSent === 0) {
			healthStatus = 'pristine';
			spamRisk = 'low';
		} else if (healthScore >= 90) {
			healthStatus = 'excellent';
			spamRisk = 'low';
		} else if (healthScore >= 75) {
			healthStatus = 'good';
			spamRisk = 'low';
		} else if (healthScore >= 50) {
			healthStatus = 'warning';
			spamRisk = 'moderate';
		} else {
			healthStatus = 'at_risk';
			spamRisk = 'critical';
		}

		return {
			...acc,
			daily_send_limit: limit,
			sent_today: sentToday,
			remaining: Math.max(0, limit - sentToday),
			total_sent: totalSent,
			delivered_count: deliveredCount,
			bounced_count: bouncedCount,
			complained_count: complainedCount,
			replied_count: repliedCount,
			bounce_rate: bounceRate,
			reply_rate: replyRate,
			health_score: healthScore,
			health_status: healthStatus,
			spam_risk: spamRisk
		};
	}));

	// Compute aggregate swarm deliverability metrics
	const swarmTotalSent = accountsWithStats.reduce((sum, a) => sum + (a.total_sent || 0), 0);
	const swarmTotalBounced = accountsWithStats.reduce((sum, a) => sum + (a.bounced_count || 0), 0);
	const swarmTotalDelivered = accountsWithStats.reduce((sum, a) => sum + (a.delivered_count || 0), 0);
	const swarmTotalComplained = accountsWithStats.reduce((sum, a) => sum + (a.complained_count || 0), 0);
	const swarmTotalReplied = accountsWithStats.reduce((sum, a) => sum + (a.replied_count || 0), 0);
	const swarmBounceRate = swarmTotalSent > 0 ? Number(((swarmTotalBounced / swarmTotalSent) * 100).toFixed(1)) : 0.0;
	const swarmReplyRate = swarmTotalSent > 0 ? Number(((swarmTotalReplied / swarmTotalSent) * 100).toFixed(1)) : 0.0;

	const activeAccounts = accountsWithStats.filter(a => (a.total_sent || 0) > 0);
	const avgHealth = activeAccounts.length > 0 
		? Math.round(activeAccounts.reduce((sum, a) => sum + a.health_score, 0) / activeAccounts.length)
		: 100;

	let overallHealthStatus = 'Pristine Health';
	let overallSpamRisk = 'low';
	if (swarmBounceRate > 5.0 || swarmTotalComplained > 0) {
		overallHealthStatus = 'High Spam Placement Risk';
		overallSpamRisk = 'critical';
	} else if (swarmBounceRate > 2.0) {
		overallHealthStatus = 'Moderate Placement Warning';
		overallSpamRisk = 'moderate';
	} else if (avgHealth >= 90) {
		overallHealthStatus = 'Pristine Health (Low Spam Risk)';
		overallSpamRisk = 'low';
	} else {
		overallHealthStatus = 'Good Health';
		overallSpamRisk = 'low';
	}

	const deliverability = {
		total_sent: swarmTotalSent,
		total_bounced: swarmTotalBounced,
		total_delivered: swarmTotalDelivered,
		total_complained: swarmTotalComplained,
		total_replied: swarmTotalReplied,
		overall_bounce_rate: swarmBounceRate,
		overall_reply_rate: swarmReplyRate,
		overall_health_score: avgHealth,
		overall_health_status_label: overallHealthStatus,
		overall_spam_risk: overallSpamRisk,
		target_bounce_rate: '< 2.0%',
		critical_bounce_threshold: '> 5.0%'
	};

	const [autoPilotVal, autoScoutVal, autoModeVal, autoModeConfigVal, autoModeLastRunVal] = await Promise.all([
		c.env.kv.get('outreach:autopilot'),
		c.env.kv.get('outreach:autoscout'),
		c.env.kv.get('outreach:automode:enabled'),
		c.env.kv.get('outreach:automode:config'),
		c.env.kv.get('outreach:automode:last_run')
	]);
	const autoPilotEnabled = autoPilotVal === '1';
	const autoScoutEnabled = autoScoutVal === '1';
	const autoModeEnabled = autoModeVal === '1';
	let autoModeConfig = { schedule: 'twice_daily', searchDepth: 'deep', target: 'both', batchSize: 6 };
	try { if (autoModeConfigVal) autoModeConfig = JSON.parse(autoModeConfigVal); } catch {}
	let autoModeLastRun = null;
	try { if (autoModeLastRunVal) autoModeLastRun = JSON.parse(autoModeLastRunVal); } catch {}

	const [jobPromptVal, clientPromptVal, globalPromptVal] = await Promise.all([
		c.env.kv.get('outreach:system_prompt:job_hunting'),
		c.env.kv.get('outreach:system_prompt:service_outreach'),
		c.env.kv.get('outreach:system_prompt:global')
	]);

	const systemPrompts = {
		job_hunting: jobPromptVal || `You are Tasin Sohad, a Senior Full-Stack & Autonomous AI Systems Engineer writing directly to a hiring manager, CTO, or tech recruiter. Write a hyper-personalized, high-converting cold email (strictly under 80 words) that stands out from generic applicants.

CORE RULES:
1. Always write in the first person as ME (Tasin Sohad: 'I', 'my'). Never talk about Tasin in the third person.
2. Skip pleasantries. Start immediately with a sharp technical hook tailored to {{company}}.
3. Reference real strengths: high-throughput full-stack systems (TypeScript, React/Vue, Node/Go), serverless edge compute (Cloudflare Workers, distributed DBs), and autonomous AI agent workflows.
4. Structure with 3 short paragraphs separated by blank lines (\\n\\n). Under 80 words.
5. Soft CTA: Ask if they are open to a 2-minute demo / GitHub repo walkthrough, or a brief 5-minute chat.
6. Sign off: Best,\\nTasin Sohad

IMPORTANT: Output your entire response ONLY as a valid JSON object: {"subject": "...", "body": "..."}`,
		service_outreach: clientPromptVal || `You are Tasin Sohad, a technical consultant and engineering partner writing directly to a Founder, CEO, CTO, or VP of Engineering at {{company}}. Write a tailored, executive-level cold outreach email (strictly under 75 words) that addresses an engineering, workflow, or AI automation backlog bottleneck.

CORE RULES:
1. Always write as ME (Tasin Sohad). Speak peer-to-peer. Never say 'Tasin Sohad steps in as...' or talk in the third person.
2. Avoid AI cliches and sales fluff. Sound like a sharp engineer sending a thoughtful note.
3. Reference {{company}}'s product or technical bottleneck and how I solved a similar bottleneck with measurable impact.
4. Structure with 3 short paragraphs separated by blank lines (\\n\\n). Under 75 words.
5. Soft CTA: 'Worth a quick 2-bullet breakdown of how we tackled this?' or 'Open to a brief 5-minute chat?'
6. Sign off: Best,\\nTasin Sohad

IMPORTANT: Output your entire response ONLY as a valid JSON object: {"subject": "...", "body": "..."}`,
		global: globalPromptVal || ''
	};

	return c.json({
		code: 200,
		data: {
			autopilot: autoPilotEnabled,
			autoscout: autoScoutEnabled,
			automode: {
				enabled: autoModeEnabled,
				config: autoModeConfig,
				lastRun: autoModeLastRun
			},
			campaigns: campaignsRes.results || [],
			stats: {
				total_leads: Number(leadsStatsRes?.total_leads) || 0,
				queued_count: Number(leadsStatsRes?.queued_count) || 0,
				sent_count: Number(leadsStatsRes?.sent_count) || 0,
				replied_count: Number(leadsStatsRes?.replied_count) || 0,
				bounced_count: Math.max(Number(leadsStatsRes?.bounced_count) || 0, swarmTotalBounced)
			},
			unreadInboxCount: Number(await db.prepare("SELECT COUNT(*) as unread FROM email WHERE type = 0 AND status = 0 AND is_del = 0").first().then(r => r?.unread).catch(() => 0)),
			deliverability,
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
	const rows = (res.results || []).map(l => {
		const tzInfo = detectLeadCountryAndTimezone(l);
		const tz = l.timezone || tzInfo.timezone;
		const local = getRecipientLocalTime(tz);
		const win = isWithinPreferableWindow(tz);
		return {
			...l,
			country: l.country || tzInfo.country,
			timezone: tz,
			local_time: local.timeStr,
			weekday: local.weekday,
			is_window_open: win.allowed,
			window_reason: win.reason
		};
	});

	return c.json({ code: 200, data: rows });
});

// 8. Add leads to queue (called by Harvey, Career-Ops, or Dashboard UI)
app.post('/outreach/lead/add', async (c) => {
	const body = await c.req.json();
	const leads = Array.isArray(body) ? body : [body];

	const stmt = c.env.db.prepare(`
		INSERT INTO outreach_lead 
		(campaign_id, target_email, target_name, company, source, country, timezone, subject, body, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued')
	`);

	const batch = leads.map(l => {
		const tzInfo = detectLeadCountryAndTimezone({ targetEmail: l.targetEmail, company: l.company, country: l.country, timezone: l.timezone });
		return stmt.bind(
			l.campaignId || 1,
			l.targetEmail,
			l.targetName || '',
			l.company || '',
			l.source || 'harvey',
			tzInfo.country,
			tzInfo.timezone,
			l.subject || '',
			l.body || ''
		);
	});

	await c.env.db.batch(batch);
	return c.json({ code: 200, message: `Added ${leads.length} leads to queue` });
});

// 9. Delete a lead
app.post('/outreach/lead/delete', async (c) => {
	const { leadId } = await c.req.json();
	await c.env.db.prepare(`DELETE FROM outreach_lead WHERE lead_id = ?`).bind(leadId).run();
	return c.json({ code: 200, message: 'Lead deleted' });
});

// Clear all leads (reset stats to 0)
app.post('/outreach/leads/clear-all', async (c) => {
	const db = c.env.db;
	await db.prepare(`DELETE FROM outreach_lead`).run();
	return c.json({
		code: 200,
		message: 'All outreach leads cleared successfully and dashboard stats reset to 0',
		data: { total_leads: 0, queued_count: 0, sent_count: 0, replied_count: 0, bounced_count: 0 }
	});
});

// 10. Dispatch batch with domain rotation
app.post('/outreach/dispatch-batch', async (c) => {
	const reqBody = await c.req.json().catch(() => ({}));
	const campaignId = reqBody.campaignId;
	const count = Math.max(1, Math.min(20, parseInt(reqBody.count, 10) || 5));
	const delayMode = reqBody.delayMode || 'human_natural';

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

	const respectTimeWindow = reqBody.respectTimeWindow !== false;
	const rawLeadsRes = await leadsStmt.all();
	const rawLeads = rawLeadsRes.results || [];
	if (rawLeads.length === 0) {
		return c.json({ code: 200, message: 'Queue is empty', sentCount: 0 });
	}

	let leads = rawLeads;
	let heldLeads = [];
	if (respectTimeWindow) {
		leads = [];
		for (const l of rawLeads) {
			const tzInfo = detectLeadCountryAndTimezone(l);
			const win = isWithinPreferableWindow(l.timezone || tzInfo.timezone);
			if (win.allowed) {
				leads.push(l);
			} else {
				heldLeads.push({ ...l, win });
			}
		}
	}

	if (leads.length === 0 && heldLeads.length > 0) {
		return c.json({
			code: 200,
			message: `Holding ${heldLeads.length} leads: Currently outside recipient country business hours (${heldLeads[0].win.reason}). Optimal window is 9:00 AM - 5:00 PM local time.`,
			sentCount: 0,
			heldCount: heldLeads.length
		});
	}

	const dateStr = dayjs().format('YYYY-MM-DD');
	const accountsRes = await c.env.db.prepare(`
		SELECT account_id, email, name, daily_send_limit FROM account WHERE is_del = 0 ORDER BY sort ASC
	`).all();
	const allAccounts = accountsRes.results || [];
	if (allAccounts.length === 0) {
		throw new BizError('No active inboxes available for sending');
	}

	const eligibleAccounts = [];
	for (const acc of allAccounts) {
		const accId = acc.account_id || acc.accountId;
		const accountDailyKey = kvConst.SEND_DAY_COUNT + 'account:' + accId + ':' + dateStr;
		const sentToday = Number(await c.env.kv.get(accountDailyKey) || 0);
		const limit = acc.daily_send_limit ?? 30;
		if (sentToday < limit) {
			eligibleAccounts.push({ ...acc, accountId: accId, sentToday, limit });
		}
	}

	if (eligibleAccounts.length === 0) {
		return c.json({
			code: 429,
			message: 'All inboxes have reached their daily sending limits for today. Increase limits or wait for tomorrow.',
			sentCount: 0
		});
	}

	let sentSuccess = 0;
	let accountIdx = 0;
	let lastError = null;

	const sendLead = async (lead) => {
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
			return false;
		}

		const accountId = senderAccount.accountId;

		try {
			const isAutoPilot = (await c.env.kv.get('outreach:autopilot')) === '1';
			let emailSubject = lead.subject;
			let emailBody = lead.body;

			if (isAutoPilot || !emailBody || emailBody.trim().length === 0) {
				const campRow = await c.env.db.prepare(`SELECT type, settings FROM campaign WHERE campaign_id = ?`).bind(lead.campaign_id).first();
				let settingsObj = {};
				try { settingsObj = JSON.parse(campRow?.settings || '{}'); } catch {}
				const generated = await generateAutonomousEmail(c, lead, settingsObj, campRow?.type || 'service_outreach');
				emailSubject = generated.subject;
				emailBody = generated.body;
			}

			const isCareerOps = (campRow?.type === 'job_hunting' || lead.campaign_id === 1);
			await emailService.send(c, {
				accountId: accountId,
				receiveEmail: [lead.target_email],
				name: 'Tasin Sohad',
				subject: emailSubject,
				text: emailBody || '',
				content: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #111; line-height: 1.6;">${(emailBody || '').replace(/\n/g, '<br/>')}</div>`,
				sendType: 'new',
				outreachSource: isCareerOps ? 'career_ops' : 'harvey',
				outreachCampaign: isCareerOps ? 'Career-Ops (Jobs)' : 'Harvey (Clients)',
				attachments: []
			}, 1);

			senderAccount.sentToday++;

			await c.env.db.prepare(`
				UPDATE outreach_lead 
				SET status = 'sent', subject = ?, body = ?, sender_email = ?, sent_time = CURRENT_TIMESTAMP 
				WHERE lead_id = ?
			`).bind(emailSubject, emailBody, senderAccount.email, lead.lead_id).run();

			sentSuccess++;
			return true;
		} catch (err) {
			console.error(`Failed sending outreach to ${lead.target_email}:`, err.stack || err.message);
			lastError = err.stack || err.message || String(err);
			return false;
		}
	};

	// Send 1st lead immediately
	await sendLead(leads[0]);

	// Drip remaining leads with human-like randomized delays in background
	const remaining = leads.slice(1);
	if (remaining.length > 0) {
		const dripRemaining = async () => {
			for (const rLead of remaining) {
				const delayMs = getHumanDelayMs(delayMode);
				console.log(`[Batch Dispatch] Human-like delay: pausing for ${(delayMs / 1000).toFixed(1)}s before sending next email...`);
				await sleep(delayMs);
				await sendLead(rLead);
			}
		};

		if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
			c.executionCtx.waitUntil(dripRemaining());
		} else {
			await dripRemaining();
		}
	}

	const delayDesc = delayMode === 'human_cautious' ? '60s–120s' : (delayMode === 'human_fast' ? '15s–30s' : '30s–60s');
	return c.json({
		code: 200,
		message: remaining.length > 0
			? `1st email sent immediately. Remaining ${remaining.length} emails queued for progressive delivery with human-like delays (${delayDesc} randomized jitter) to avoid blasting.`
			: `Email dispatched successfully across rotated inboxes.`,
		sentCount: sentSuccess,
		queuedRemaining: remaining.length,
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

	const candidateModels = getProviderCandidateModels(provider, model);
	let lastError = null;
	let primaryModelError = null;

	for (const candidate of candidateModels) {
		const startTime = Date.now();
		try {
			const result = await executeProviderChat(
				provider,
				key,
				base,
				candidate,
				'You are a status verification bot. Answer with valid JSON: {"status": "ok", "message": "Connection verified successfully"}',
				'Verify connectivity and response time in valid JSON.',
				10000
			);
			const latency = Date.now() - startTime;
			const isFallback = Boolean(model && candidate !== model);
			const message = isFallback 
				? `Connected with fallback model "${candidate}" (${latency}ms latency)! Note: Primary model "${model}" failed.`
				: `Connected successfully with ${candidate} (${latency}ms latency)!`;

			return c.json({
				code: 200,
				success: true,
				latencyMs: latency,
				modelUsed: candidate,
				isFallback,
				message,
				preview: (result || '').slice(0, 150),
				data: {
					success: true,
					latencyMs: latency,
					modelUsed: candidate,
					isFallback,
					message,
					preview: (result || '').slice(0, 150)
				}
			});
		} catch (err) {
			const latency = Date.now() - startTime;
			if (!primaryModelError && model && candidate === model) {
				primaryModelError = err.message;
			}
			lastError = err;
			console.warn(`[Test Provider] Model "${candidate}" failed for ${provider}: ${err.message}. Trying next candidate model...`);
		}
	}

	return c.json({
		code: 200,
		success: false,
		error: lastError?.message || 'Connection test failed across all candidate models for this provider',
		data: {
			success: false,
			error: lastError?.message || 'Connection test failed across all candidate models for this provider'
		}
	});
});

app.post('/outreach/telegram/test', async (c) => {
	const { tgBotToken, tgChatId } = await c.req.json();

	const token = (tgBotToken || '').trim();
	const chatId = (tgChatId || '').trim();

	if (!token || !chatId) {
		throw new BizError('Both Telegram Bot Token and Chat ID are required for testing');
	}

	const appBaseUrl = 'https://cloud-mail.sohad-flowtics.workers.dev';
	const testText = `🤖 <b>[Cloud Mailreach Outreach Test]</b>\n\n` +
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
							text: '🚀 Open Cloud Mailreach Dashboard',
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

// Toggle Autonomous Auto-Scouting (Opportunity Discovery)
app.post('/outreach/autoscout/toggle', async (c) => {
	const { enabled } = await c.req.json();
	await c.env.kv.put('outreach:autoscout', enabled ? '1' : '0');
	return c.json({
		code: 200,
		message: `Autonomous Auto-Scouting is now ${enabled ? 'ACTIVE' : 'PAUSED'}`,
		data: { enabled: Boolean(enabled) }
	});
});

// Toggle Full Autonomous Auto Mode
app.post('/outreach/automode/toggle', async (c) => {
	const body = await c.req.json();
	const enabled = Boolean(body.enabled);
	await c.env.kv.put('outreach:automode:enabled', enabled ? '1' : '0');
	if (body.config) {
		await c.env.kv.put('outreach:automode:config', JSON.stringify(body.config));
	}
	return c.json({
		code: 200,
		message: `Full Autonomous Auto Mode is now ${enabled ? 'ACTIVATED' : 'PAUSED'}`,
		data: { enabled }
	});
});

// Run Full Auto Cycle Immediately on Demand
app.post('/outreach/automode/run-now', async (c) => {
	const body = await c.req.json().catch(() => ({}));
	const report = await executeFullAutoOutreachCycle(c, body);
	return c.json({
		code: 200,
		message: report.message,
		data: report
	});
});

// Trigger Opportunity Scout on Demand (Career-Ops or Harvey)
app.post('/outreach/scout/trigger', async (c) => {
	const { type = 'job_hunting', count = 5 } = await c.req.json();
	const numCount = Math.max(1, Math.min(25, parseInt(count, 10) || 5));
	const result = await scoutOpportunities(c, type, numCount);
	return c.json({
		code: 200,
		message: `Autonomous Scout discovered ${result.scouted} opportunities and added ${result.added} fresh leads to the queue`,
		data: result
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


// ============================================================================
// 19. Deliverability & Spam Health Suite
// ============================================================================

// Helper to query Cloudflare DNS-over-HTTPS
async function checkDomainDns(domain) {
	const result = {
		domain,
		spf: { ok: false, raw: null },
		dmarc: { ok: false, raw: null },
		dkim: { ok: true, note: 'DKIM cryptographic signing managed by outbound relay' },
		provider: ['nccwtech.com', 'saiftechnology.com'].includes(domain) ? 'Brevo' : 'Resend',
		status: 'healthy',
		recommendation: null
	};

	try {
		// 1. Check SPF record
		const spfRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=TXT`, {
			headers: { 'Accept': 'application/dns-json' }
		});
		if (spfRes.ok) {
			const spfData = await spfRes.json();
			const record = (spfData.Answer || []).find(a => a.data && a.data.includes('v=spf1'));
			if (record) {
				result.spf.ok = true;
				result.spf.raw = record.data.replace(/^"|"$/g, '');
			}
		}

		// 2. Check DMARC record
		const dmarcRes = await fetch(`https://cloudflare-dns.com/dns-query?name=_dmarc.${domain}&type=TXT`, {
			headers: { 'Accept': 'application/dns-json' }
		});
		if (dmarcRes.ok) {
			const dmarcData = await dmarcRes.json();
			const record = (dmarcData.Answer || []).find(a => a.data && a.data.includes('v=DMARC1'));
			if (record) {
				result.dmarc.ok = true;
				result.dmarc.raw = record.data.replace(/^"|"$/g, '');
			}
		}

		if (!result.spf.ok && !result.dmarc.ok) {
			result.status = 'critical';
			result.recommendation = `Missing both SPF and DMARC TXT records. Google and Yahoo will flag emails from ${domain} as high-risk spam.`;
		} else if (!result.dmarc.ok) {
			result.status = 'warning';
			result.recommendation = `DMARC record missing! Add a TXT record for '_dmarc.${domain}' with value 'v=DMARC1; p=none; sp=none; aspf=r;' to ensure inbox placement with Google and Yahoo.`;
		} else if (!result.spf.ok) {
			result.status = 'warning';
			result.recommendation = `SPF record missing! Add TXT record for '${domain}' with valid SPF relay.`;
		}
	} catch (e) {
		console.warn(`DNS check failed for ${domain}:`, e.message);
	}
	return result;
}

// 19. Deliverability Health Audit
app.get('/outreach/deliverability/health', async (c) => {
	const db = c.env.db;
	const domains = ['technetocrat.org', 'swiftsuretech.com', 'nccwtech.com', 'saiftechnology.com'];

	// 1. Run live DNS checks across all 4 domains in parallel
	const dnsChecks = await Promise.all(domains.map(d => checkDomainDns(d)));

	// 2. Fetch recent bounce / spam events from email table
	const recentEmailEvents = await db.prepare(`
		SELECT email_id, send_email, to_email, subject, status, message, create_time 
		FROM email 
		WHERE status IN (3, 4, 6) 
		ORDER BY create_time DESC 
		LIMIT 20
	`).all().catch(() => ({ results: [] }));

	// 3. Fetch recent bounce / spam leads from outreach_lead
	const recentLeadEvents = await db.prepare(`
		SELECT lead_id, target_email, sender_email, subject, status, reply_text, update_time 
		FROM outreach_lead 
		WHERE status IN ('bounced', 'complained') 
		ORDER BY update_time DESC 
		LIMIT 20
	`).all().catch(() => ({ results: [] }));

	// 4. Return complete deliverability diagnostics
	return c.json({
		code: 200,
		data: {
			domains: dnsChecks,
			recentEmailEvents: recentEmailEvents.results || [],
			recentLeadEvents: recentLeadEvents.results || [],
			spamPlacementGuide: {
				signals: [
					{
						name: 'Bounce Rate Threshold',
						status: 'Monitored',
						threshold: 'Target < 2.0% | Warning > 2.0% | Critical > 5.0%',
						description: 'Hard bounces happen when an email address is invalid or non-existent. When bounce rate exceeds 5%, ESPs and mail filters (Gmail, Outlook) automatically downgrade your domain IP reputation, causing future emails to land directly in Spam or Junk.'
					},
					{
						name: 'Spam Complaint Webhooks',
						status: 'Active',
						threshold: 'Target < 0.1% | Critical > 0.3%',
						description: 'Resend and Brevo instantly notify Cloud Mailreach via webhooks whenever a recipient clicks "Report Spam". If complaint rate exceeds 0.3%, sending is throttled immediately to prevent domain burning.'
					},
					{
						name: 'Silent Spam Placement Detection (The Cold Trap Heuristic)',
						status: 'Monitored',
						threshold: 'Sent > 30 with 0% replies & 0% bounces',
						description: 'When an inbox sends dozens of cold emails but receives 0 replies while other inboxes get replies, mailbox traffic is usually silently routed to the Spam folder or Google Promotions tab rather than the primary inbox.'
					},
					{
						name: 'DNS DMARC & SPF Alignment',
						status: 'Live Audited',
						threshold: '100% PASS Required by Google & Yahoo (Feb 2024+)',
						description: 'Without a published DMARC policy, modern recipient mail servers reject incoming cold outreach or deliver it straight to the Spam/Quarantine folder.'
					}
				]
			}
		}
	});
});

// 20. Advanced Pre-Flight Cold Email Spam & Deliverability Inspector
app.post('/outreach/deliverability/spam-check', async (c) => {
	const { subject = '', body = '', targetEmail = '' } = await c.req.json();

	const spamTriggers = [
		'100% free', '100% satisfied', 'act now', 'apply now', 'all natural', 'as seen on',
		'bad credit', 'bargain', 'be your own boss', 'best price', 'big bucks', 'billion',
		'bonus', 'buy direct', 'call now', 'cancel at any time', 'cash bonus', 'cash prize',
		'cents on the dollar', 'certified', 'cheap', 'claims', 'clearance', 'click here',
		'click now', 'compare rates', 'congratulations', 'credit card', 'cure', 'dear friend',
		'direct email', 'discount', 'double your income', 'earn cash', 'earn extra cash',
		'earn money', 'eliminate debt', 'exclusive deal', 'expect to earn', 'extra income',
		'fast cash', 'financial freedom', 'free consultation', 'free gift', 'free info',
		'free membership', 'free preview', 'free sample', 'free trial', 'full refund',
		'get out of debt', 'get paid', 'giveaway', 'guaranteed', 'hidden assets', 'income from home',
		'increase sales', 'instant', 'investment', 'join millions', 'lifetime', 'limited time',
		'lowest price', 'make money', 'millionaire', 'miracle', 'money back', 'mortgage rates',
		'multi-level', 'no catch', 'no cost', 'no credit check', 'no experience', 'no fees',
		'no gimmick', 'no hidden costs', 'no obligation', 'no purchase necessary', 'no risk',
		'no strings attached', 'not spam', 'now only', 'once in a lifetime', 'one time',
		'online marketing', 'open immediately', 'opportunity', 'order now', 'passwords',
		'pennies a day', 'potential earnings', 'prize', 'promise you', 'pure profit',
		'refinance', 'risk free', 'satisfaction guaranteed', 'save big', 'save money',
		'score', 'special promotion', 'supplies are limited', 'take action', 'terms and conditions',
		'this isn\'t spam', 'unlimited', 'unsecured credit', 'urgent', 'valuable', 'viagra',
		'warranty', 'winner', 'winning', 'work from home', 'you have been selected', 'zero risk'
	];

	const detectedTriggers = [];
	const suggestions = [];
	const subLower = (subject || '').toLowerCase();
	const bodyLower = (body || '').toLowerCase();
	const combined = subLower + ' ' + bodyLower;

	let spamScore = 0;

	// Heuristic 1: Raw Cloud Storage Links (Google Drive / Dropbox / OneDrive) -> Phishing / Malware flag
	const rawCloudDriveRegex = /(https?:\/\/)?(drive\.google\.com|docs\.google\.com|dropbox\.com|onedrive\.live\.com|box\.com|wetransfer\.com)[^\s]*/gi;
	const cloudDriveMatches = (body + ' ' + subject).match(rawCloudDriveRegex);
	if (cloudDriveMatches && cloudDriveMatches.length > 0) {
		spamScore += 40;
		detectedTriggers.push({
			trigger: 'Raw Cloud Storage Share Link (' + cloudDriveMatches[0].slice(0, 35) + '...)',
			location: 'Body',
			penalty: 40,
			severity: 'critical'
		});
		suggestions.push('CRITICAL: Remove raw Google Drive / cloud storage links! Google Workspace and Outlook filters automatically flag cold emails with raw file-share links as phishing hazards. Mention your GitHub or portfolio domain instead.');
	}

	// Heuristic 2: URL Shorteners (bit.ly, tinyurl, t.co)
	const shortenerRegex = /(https?:\/\/)?(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|ow\.ly)[^\s]*/gi;
	const shortenerMatches = (body + ' ' + subject).match(shortenerRegex);
	if (shortenerMatches && shortenerMatches.length > 0) {
		spamScore += 35;
		detectedTriggers.push({
			trigger: 'URL Shortener Detected (' + shortenerMatches[0] + ')',
			location: 'Body',
			penalty: 35,
			severity: 'high'
		});
		suggestions.push('Replace URL shorteners with direct, authentic domain links. Shorteners trigger automated SpamAssassin penalties.');
	}

	// Heuristic 3: Generic Blast Greetings
	const genericGreetings = ['hi hiring team', 'dear hiring manager', 'dear sir', 'dear madam', 'to whom it may concern', 'i came across your company', 'hope this email finds you well'];
	for (const g of genericGreetings) {
		if (combined.includes(g)) {
			spamScore += 20;
			detectedTriggers.push({
				trigger: 'Generic Blast Greeting ("' + g + '")',
				location: 'Greeting',
				penalty: 20,
				severity: 'medium'
			});
			suggestions.push('Avoid generic blast salutations like "' + g + '". Address the person directly or start immediately with a technical hook.');
		}
	}

	// Heuristic 4: Cold Sales Trigger Keywords
	for (const trigger of spamTriggers) {
		const inSubject = subLower.includes(trigger);
		const inBody = bodyLower.includes(trigger);
		if (inSubject || inBody) {
			const weight = inSubject ? 18 : 10;
			spamScore += weight;
			detectedTriggers.push({
				trigger,
				location: inSubject && inBody ? 'Subject & Body' : (inSubject ? 'Subject' : 'Body'),
				penalty: weight,
				severity: inSubject ? 'high' : 'medium'
			});
		}
	}

	// Heuristic 5: Excessive Punctuation & Dollar Signs
	const excessiveExclamation = (subject + ' ' + body).match(/!{2,}/g);
	if (excessiveExclamation) {
		spamScore += 15;
		detectedTriggers.push({ trigger: 'Multiple Exclamation Marks (!!)', location: 'Text', penalty: 15, severity: 'medium' });
		suggestions.push('Avoid multiple exclamation marks; use clean professional sentence stops.');
	}

	const dollarSigns = (subject.match(/\$/g) || []).length;
	if (dollarSigns > 0) {
		spamScore += 15;
		detectedTriggers.push({ trigger: 'Dollar Sign ($) in Subject', location: 'Subject', penalty: 15, severity: 'medium' });
		suggestions.push('Remove currency symbols from the subject line to avoid commercial promotional filtering.');
	}

	// Heuristic 6: Excessive Capitalization
	const words = (body || '').split(/\s+/).filter(Boolean);
	const upperWords = words.filter(w => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w));
	const upperRatio = words.length > 0 ? upperWords.length / words.length : 0;
	if (upperRatio > 0.15 && words.length > 5) {
		spamScore += 20;
		detectedTriggers.push({ trigger: 'Excessive All-Caps Words (> 15%)', location: 'Body', penalty: 20, severity: 'high' });
		suggestions.push('Avoid ALL-CAPS words. Write in natural sentence case.');
	}

	// Heuristic 7: Word Count Optimization
	const wordCount = words.length;
	if (wordCount > 130) {
		spamScore += 15;
		suggestions.push('Email is ' + wordCount + ' words. Best practice cold email length is 50-85 words for maximum deliverability and replies.');
	} else if (wordCount < 20 && wordCount > 0) {
		spamScore += 10;
		suggestions.push('Email is very brief (< 20 words). Provide a concise technical context.');
	}

	// Heuristic 8: Target Recipient MX Check (if target email supplied)
	let targetMxInfo = null;
	if (targetEmail && targetEmail.includes('@')) {
		const targetDomain = targetEmail.split('@')[1];
		const hasMx = await verifyDomainMx(targetDomain);
		targetMxInfo = {
			domain: targetDomain,
			hasMx,
			status: hasMx ? 'Active MX Verified' : 'NO MX RECORDS (DEAD DOMAIN)'
		};
		if (!hasMx) {
			spamScore += 50;
			detectedTriggers.push({
				trigger: 'Destination Domain has NO MX Records (' + targetDomain + ')',
				location: 'Recipient',
				penalty: 50,
				severity: 'critical'
			});
			suggestions.push('CRITICAL: ' + targetDomain + ' has NO mail servers (MX records). Sending will result in a hard bounce, degrading your domain reputation.');
		}
	}

	spamScore = Math.min(100, spamScore);

	// Predicted Folder Placement
	let predictedFolder = 'Primary Inbox';
	let folderClass = 'primary';
	if (spamScore > 40) {
		predictedFolder = 'Spam / Junk Folder';
		folderClass = 'spam';
	} else if (spamScore > 18) {
		predictedFolder = 'Promotions / Updates Tab';
		folderClass = 'promotions';
	}

	let level = 'clean';
	if (spamScore > 50) level = 'high_risk';
	else if (spamScore > 25) level = 'moderate_risk';
	else if (spamScore > 10) level = 'low_risk';

	if (detectedTriggers.length === 0) {
		suggestions.push('Excellent! Copy is clean, personal, and complies with modern inbox placement standards.');
	}

	return c.json({
		code: 200,
		data: {
			spamScore,
			level,
			predictedFolder,
			folderClass,
			targetMxInfo,
			detectedTriggers,
			suggestions,
			metrics: {
				wordCount,
				charCount: (body || '').length,
				detectedTriggersCount: detectedTriggers.length
			}
		}
	});
});

// 21. Deliverability Diagnostic Test Dispatcher
app.post('/outreach/deliverability/test-send', async (c) => {
	const { fromEmail, testEmail } = await c.req.json();
	if (!testEmail || !testEmail.includes('@')) {
		throw new BizError('A valid test destination email address is required');
	}

	const db = c.env.db;
	let acc = null;
	if (fromEmail) {
		acc = await db.prepare(`SELECT account_id, email, name FROM account WHERE email = ? AND is_del = 0`).bind(fromEmail).first();
	}
	if (!acc) {
		acc = await db.prepare(`SELECT account_id, email, name FROM account WHERE is_del = 0 ORDER BY account_id ASC LIMIT 1`).first();
	}
	if (!acc) {
		throw new BizError('No active sending mailboxes found');
	}

	const senderDomain = (acc.email || '').split('@')[1] || '';
	const timestamp = new Date().toUTCString();
	const testSubject = `🛡️ Deliverability Diagnostic: ${acc.email} [${new Date().toISOString().slice(11, 19)}]`;
	const testBody = `This is an automated deliverability diagnostic check from Cloud Mailreach.
Sender: ${acc.email}
Timestamp: ${timestamp}
Domain: ${senderDomain}

Authentication Check:
- Return-Path / SPF: Evaluated by recipient MTA
- DKIM Signature: Provided by relay provider
- DMARC Alignment: Checked against ${senderDomain}

If this email arrived in your Primary Inbox, your sender reputation and DNS authentication are working properly. If it landed in Spam or Junk, inspect the message headers ("Show Original" in Gmail) to verify SPF, DKIM, and DMARC.`;

	await emailService.send(c, {
		accountId: acc.account_id,
		receiveEmail: [testEmail.trim()],
		name: acc.name || 'Tasin Sohad',
		subject: testSubject,
		text: testBody,
		content: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #111; line-height: 1.6; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
			<div style="display: flex; align-items: center; margin-bottom: 16px;">
				<h2 style="color: #4f46e5; margin: 0; font-size: 20px;">🛡️ Cloud Mailreach Deliverability Diagnostic</h2>
			</div>
			<p style="margin: 0 0 16px 0; color: #334155;">This is a live diagnostic placement test email dispatched directly from your cold outreach pool.</p>
			
			<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #4f46e5; border-radius: 6px; padding: 14px; margin-bottom: 20px; font-family: monospace; font-size: 13px; color: #1e293b;">
				<div><strong>Sender Mailbox:</strong> ${acc.email}</div>
				<div><strong>Target Destination:</strong> ${testEmail.trim()}</div>
				<div><strong>Timestamp:</strong> ${timestamp}</div>
				<div><strong>Authenticated Domain:</strong> ${senderDomain}</div>
			</div>

			<h3 style="color: #0f172a; font-size: 15px; margin: 0 0 10px 0;">How to verify your Inbox Placement:</h3>
			<ol style="margin: 0; padding-left: 20px; color: #334155; line-height: 1.7;">
				<li><strong>Placement Verification:</strong> Confirm if this email landed in your <strong>Primary Inbox</strong>, <strong>Promotions</strong>, or <strong>Spam / Junk</strong> folder.</li>
				<li><strong>Authentication Headers:</strong> In Gmail, click <em>More (three dots) &rarr; "Show original"</em>. In Outlook, click <em>"View message source"</em>.</li>
				<li><strong>Pass Requirements:</strong> Ensure all 3 say <strong>SPF: PASS</strong>, <strong>DKIM: PASS</strong>, and <strong>DMARC: PASS</strong>.</li>
			</ol>

			<hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
			<div style="font-size: 12px; color: #94a3b8; text-align: center;">
				Cloud Mailreach Autonomous Cold Outreach Engine · Built for Tasin Sohad
			</div>
		</div>`,
		sendType: 'new',
		outreachSource: 'diagnostic_test',
		outreachCampaign: 'Deliverability Diagnostic',
		attachments: []
	}, 1);

	return c.json({
		code: 200,
		message: `Diagnostic test email sent from ${acc.email} to ${testEmail}. Check your inbox or spam folder.`
	});
});

// ============================================================================
// 22. Master Inbox & Unified Inbound Reply Hub
// ============================================================================

// GET /outreach/inbox: List all inbound replies and emails across all 28 mailboxes
app.get('/outreach/inbox', async (c) => {
	const db = c.env.db;
	const { page = 1, size = 50, domain, filter, search } = c.req.query();
	const pageNum = Math.max(1, parseInt(page, 10) || 1);
	const pageSize = Math.max(10, Math.min(100, parseInt(size, 10) || 50));
	const offset = (pageNum - 1) * pageSize;

	let sql = `
		SELECT 
			e.email_id,
			e.send_email,
			e.to_email,
			e.name as sender_name,
			e.subject,
			e.text,
			e.create_time,
			e.status as email_status,
			l.lead_id,
			l.company,
			l.target_name,
			l.status as lead_status,
			l.subject as sent_subject,
			l.body as sent_body,
			l.sent_time,
			l.sender_email as original_sender_email,
			c.campaign_id,
			c.name as campaign_name,
			c.type as campaign_type
		FROM email e
		LEFT JOIN outreach_lead l ON (
			LOWER(TRIM(e.send_email)) = LOWER(TRIM(l.target_email)) 
			OR e.email_id = l.reply_email_id
			OR (
				e.send_email LIKE '%@%' AND l.target_email LIKE '%@%'
				AND SUBSTR(e.send_email, INSTR(e.send_email, '@') + 1) = SUBSTR(l.target_email, INSTR(l.target_email, '@') + 1)
				AND l.status IN ('sent', 'replied')
			)
		)
		LEFT JOIN campaign c ON l.campaign_id = c.campaign_id
		WHERE e.type = 0 AND e.is_del = 0
	`;

	const params = [];

	if (domain && domain !== 'all') {
		sql += ` AND e.to_email LIKE ?`;
		params.push(`%@${domain}`);
	}

	if (search && search.trim()) {
		const s = `%${search.trim().toLowerCase()}%`;
		sql += ` AND (LOWER(e.send_email) LIKE ? OR LOWER(e.subject) LIKE ? OR LOWER(COALESCE(l.company, '')) LIKE ? OR LOWER(COALESCE(e.text, '')) LIKE ?)`;
		params.push(s, s, s, s);
	}

	sql += ` ORDER BY e.create_time DESC LIMIT ? OFFSET ?`;
	params.push(pageSize, offset);

	const rows = await db.prepare(sql).bind(...params).all().catch(err => {
		console.error('Error fetching master inbox:', err);
		return { results: [] };
	});

	// Get count of unread and prospect replies
	const [countRes, prospectRepliesRes] = await Promise.all([
		db.prepare(`SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END), 0) as unread FROM email WHERE type = 0 AND is_del = 0`).first().catch(() => ({ total: 0, unread: 0 })),
		db.prepare(`SELECT COUNT(*) as total FROM outreach_lead WHERE status = 'replied'`).first().catch(() => ({ total: 0 }))
	]);

	// Enrich each item with classification tag
	const items = (rows.results || []).map(r => {
		const txt = (r.text || '').toLowerCase();
		const subj = (r.subject || '').toLowerCase();
		let intent = 'general';

		if (txt.includes('ticket') || txt.includes('t-j') || txt.includes('support assistant') || txt.includes('help center') || txt.includes('careers page') || txt.includes('apply at')) {
			intent = 'ticket';
		} else if (txt.includes('interview') || txt.includes('chat') || txt.includes('calendly') || txt.includes('call') || txt.includes('meet') || txt.includes('available') || txt.includes('portfolio') || txt.includes('resume')) {
			intent = 'interview';
		} else if (txt.includes('interested') || txt.includes('tell me more') || txt.includes('rates') || txt.includes('proposal') || txt.includes('pricing')) {
			intent = 'interested';
		} else if (txt.includes('unsubscribe') || txt.includes('remove') || txt.includes('not interested') || txt.includes('no thank')) {
			intent = 'uninterested';
		} else if (r.lead_id) {
			intent = 'prospect_reply';
		}

		return {
			...r,
			intent,
			isProspect: Boolean(r.lead_id)
		};
	});

	return c.json({
		code: 200,
		data: {
			items,
			total: countRes?.total || 0,
			unread: countRes?.unread || 0,
			prospectReplies: prospectRepliesRes?.total || 0,
			page: pageNum,
			size: pageSize
		}
	});
});

// GET /outreach/inbox/thread/:emailId: View conversation thread
app.get('/outreach/inbox/thread/:emailId', async (c) => {
	const db = c.env.db;
	const emailId = parseInt(c.req.param('emailId'), 10);
	if (!emailId) throw new BizError('Invalid email ID');

	const emailRow = await db.prepare(`
		SELECT e.*, a.account_id 
		FROM email e 
		LEFT JOIN account a ON e.to_email = a.email
		WHERE e.email_id = ? AND e.is_del = 0
	`).bind(emailId).first();

	if (!emailRow) throw new BizError('Email not found');

	// Find matched lead
	const lead = await db.prepare(`
		SELECT l.*, c.name as campaign_name, c.type as campaign_type
		FROM outreach_lead l
		JOIN campaign c ON l.campaign_id = c.campaign_id
		WHERE LOWER(TRIM(l.target_email)) = LOWER(TRIM(?))
		   OR l.reply_email_id = ?
		   OR (
		     l.target_email LIKE '%@%' AND ? LIKE '%@%'
		     AND SUBSTR(l.target_email, INSTR(l.target_email, '@') + 1) = SUBSTR(?, INSTR(?, '@') + 1)
		     AND l.status IN ('sent', 'replied')
		   )
		ORDER BY l.sent_time DESC LIMIT 1
	`).bind(emailRow.send_email, emailId, emailRow.send_email, emailRow.send_email, emailRow.send_email).first().catch(() => null);

	// Mark email as read
	await db.prepare(`UPDATE email SET status = 1 WHERE email_id = ?`).bind(emailId).run().catch(() => {});

	return c.json({
		code: 200,
		data: {
			inbound: emailRow,
			matchedLead: lead,
			originalOutbound: lead?.body ? { subject: lead.subject, body: lead.body, sentTime: lead.sent_time, sender: lead.sender_email } : null
		}
	});
});

// POST /outreach/inbox/reply: Send a direct response from the receiving mailbox
app.post('/outreach/inbox/reply', async (c) => {
	const db = c.env.db;
	const { emailId, toEmail, subject, text } = await c.req.json();

	if (!toEmail || !text || !text.trim()) {
		throw new BizError('Recipient email and reply text are required');
	}

	const original = await db.prepare(`SELECT to_email, send_email, subject, name FROM email WHERE email_id = ?`).bind(emailId).first();
	const fromEmail = original?.to_email;

	const account = await db.prepare(`SELECT account_id, email, name FROM account WHERE email = ? AND is_del = 0`).bind(fromEmail).first();
	if (!account) {
		throw new BizError(`Sending account for ${fromEmail} not found`);
	}

	const replySubject = subject || (original?.subject?.startsWith('Re:') ? original.subject : `Re: ${original?.subject || 'Follow-up'}`);
	const formattedHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #111; line-height: 1.6;">${text.replace(/\n/g, '<br/>')}</div>`;

	await emailService.send(c, {
		accountId: account.account_id,
		receiveEmail: [toEmail.trim()],
		name: 'Tasin Sohad',
		subject: replySubject,
		text: text.trim(),
		content: formattedHtml,
		sendType: 'reply',
		outreachSource: 'master_inbox_reply',
		replyEmailId: emailId,
		attachments: []
	}, 1);

	// Update lead status to replied if linked
	await db.prepare(`
		UPDATE outreach_lead 
		SET status = 'replied', reply_time = CURRENT_TIMESTAMP 
		WHERE target_email = ? OR reply_email_id = ?
	`).bind(toEmail.trim().toLowerCase(), emailId).run().catch(() => {});

	return c.json({
		code: 200,
		message: `Reply dispatched from ${account.email} to ${toEmail}`
	});
});

// POST /outreach/inbox/ai-reply-draft: AI drafts a smart contextual reply
app.post('/outreach/inbox/ai-reply-draft', async (c) => {
	const { prospectEmail, prospectMessage, company, subject } = await c.req.json();

	const systemPrompt = `You are Tasin Sohad, a Senior Full-Stack & Autonomous AI Systems Engineer writing a direct, thoughtful reply to a prospect or hiring manager.
CORE RULES:
1. Always write as ME (Tasin Sohad: 'I', 'my'). Speak peer-to-peer.
2. Acknowledge what they wrote naturally.
3. If they asked to apply on a portal or careers page (like a ticketing assistant), thank them, confirm application, and politely ask if there is a direct engineering manager/CTO you can connect with.
4. If they asked for a portfolio, provide github.com/tasinsohad and offer a 2-minute live demo of your agent architecture.
5. If they suggested a call or interview, offer your direct scheduling availability (EST/CET/GMT).
6. Under 80 words. Never include raw Google Drive links or spam phrases.
7. Sign off: Best,\nTasin Sohad`;

	const userPrompt = `Prospect Email: ${prospectEmail}
Company: ${company || 'their team'}
Subject: ${subject}
Incoming Message:
${prospectMessage || '(no message content)'}

Draft a crisp, high-converting first-person response from Tasin Sohad. Output plain text reply only.`;

	let replyText = '';
	try {
		const activeLlms = await c.env.db.prepare(`SELECT * FROM llm_config WHERE is_active = 1 ORDER BY priority ASC LIMIT 1`).all();
		const topLlm = activeLlms?.results?.[0];
		if (topLlm && (topLlm.api_key || topLlm.provider === 'custom')) {
			replyText = await executeProviderChat(
				topLlm.provider,
				topLlm.api_key,
				topLlm.base_url,
				topLlm.selected_model,
				systemPrompt,
				userPrompt,
				15000
			);
		}
	} catch (e) {
		console.warn('AI reply generation fallback:', e.message);
	}

	if (!replyText || !replyText.trim()) {
		replyText = `Hi there,\n\nThanks for getting back to me! I appreciate the response.\n\nI would love to connect briefly or share a quick 2-minute demo of the autonomous systems and full-stack pipelines I build (github.com/tasinsohad).\n\nAre you free for a brief 5-minute chat this week?\n\nBest,\nTasin Sohad`;
	}

	return c.json({
		code: 200,
		data: { reply: replyText.trim() }
	});
});

// POST /outreach/purge-dead-leads: Removes queued leads whose domains have NO MX records
app.post('/outreach/purge-dead-leads', async (c) => {
	const db = c.env.db;
	const queued = await db.prepare(`SELECT lead_id, target_email, company FROM outreach_lead WHERE status = 'queued'`).all();
	const list = queued?.results || [];

	const deadIds = [];
	for (const item of list) {
		const domain = (item.target_email || '').split('@')[1];
		if (!domain) {
			deadIds.push(item.lead_id);
			continue;
		}
		const hasMx = await verifyDomainMx(domain);
		if (!hasMx) {
			deadIds.push(item.lead_id);
		}
	}

	if (deadIds.length > 0) {
		const placeholders = deadIds.map(() => '?').join(',');
		await db.prepare(`DELETE FROM outreach_lead WHERE lead_id IN (${placeholders})`).bind(...deadIds).run();
	}

	return c.json({
		code: 200,
		message: `Scanned ${list.length} queued leads. Purged ${deadIds.length} dead leads with no MX records.`,
		data: { scanned: list.length, purged: deadIds.length }
	});
});
