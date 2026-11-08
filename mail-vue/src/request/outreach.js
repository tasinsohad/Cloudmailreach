import http from '@/axios/index.js';

export function getOutreachDashboard() {
    return http.get('/outreach/dashboard');
}

export function createCampaign(campaignData) {
    return http.post('/outreach/campaign/create', campaignData);
}

export function updateCampaignSettings(data) {
    return http.post('/outreach/campaign/settings/update', data);
}

export function deleteCampaign(data) {
    return http.post('/outreach/campaign/delete', data);
}

export function toggleCampaign(campaignId, status) {
    return http.post('/outreach/campaign/toggle', { campaignId, status });
}

export function updateCampaign(campaignId, dailyLimit) {
    return http.post('/outreach/campaign/update', { campaignId, dailyLimit });
}

export function getOutreachLeads(params) {
    return http.get('/outreach/leads', { params });
}

export function addOutreachLead(leadData) {
    return http.post('/outreach/lead/add', leadData);
}

export function deleteOutreachLead(leadId) {
    return http.post('/outreach/lead/delete', { leadId });
}

export function dispatchOutreachBatch(campaignId, count) {
    return http.post('/outreach/dispatch-batch', { campaignId, count });
}

export function updateTelegramSettings(tgBotToken, tgChatId) {
    return http.post('/outreach/telegram/update', { tgBotToken, tgChatId });
}

export function testTelegramSettings(tgBotToken, tgChatId) {
    return http.post('/outreach/telegram/test', { tgBotToken, tgChatId });
}

export function fetchLlmModels(provider, apiKey, baseUrl) {
    return http.post('/outreach/llm/fetch-models', { provider, apiKey, baseUrl });
}

export function saveLlmConfig(data) {
    return http.post('/outreach/llm/save-config', data);
}

export function updateInboxLimit(accountId, dailyLimit) {
    return http.post('/outreach/inbox/update-limit', { accountId, dailyLimit });
}

export function batchUpdateInboxLimits(dailyLimit, domain) {
    return http.post('/outreach/inbox/batch-limit', { dailyLimit, domain });
}
