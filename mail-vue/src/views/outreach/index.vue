<template>
  <div class="outreach-page">
    <el-scrollbar height="100%">
      <div class="outreach-container">
        
        <!-- Header -->
        <div class="page-header">
          <div>
            <h1 class="page-title">Cold Outreach Control Center</h1>
            <p class="page-subtitle">Autonomous multi-domain cold outreach across Resend & Brevo with 20 rotating inboxes</p>
          </div>
          <div class="header-buttons">
            <el-button :loading="loading" @click="fetchData">
              <Icon icon="fluent:arrow-sync-20-regular" width="18" height="18" style="margin-right: 6px;" />
              Refresh
            </el-button>
            <el-button type="danger" plain :loading="loading" @click="handleClearAllLeads">
              <Icon icon="fluent:delete-dismiss-24-regular" width="18" height="18" style="margin-right: 6px;" />
              Reset Stats
            </el-button>
            <el-button type="primary" @click="openCreateCampaignDialog">
              <Icon icon="fluent:folder-add-24-filled" width="18" height="18" style="margin-right: 6px;" />
              Create Campaign (+ Lead List)
            </el-button>
            <el-button type="warning" :loading="dispatching" @click="openDispatchDialog">
              <Icon icon="fluent:send-24-filled" width="18" height="18" style="margin-right: 6px;" />
              Dispatch Batch Now
            </el-button>
          </div>
        </div>

        <!-- Autonomous Auto-Pilot Master Bar -->
        <div class="autopilot-banner" :class="{ 'autopilot-active': autoPilotEnabled }">
          <div class="autopilot-left">
            <div class="autopilot-icon-box">
              <Icon :icon="autoPilotEnabled ? 'fluent:bot-sparkle-24-filled' : 'fluent:bot-24-regular'" width="28" height="28" />
            </div>
            <div>
              <div class="autopilot-title-row">
                <span class="autopilot-heading">Autonomous Auto-Pilot</span>
                <el-tag :type="autoPilotEnabled ? 'success' : 'info'" effect="dark" round size="small">
                  {{ autoPilotEnabled ? 'ACTIVE & WRITING' : 'PAUSED (MANUAL MODE)' }}
                </el-tag>
              </div>
              <div class="autopilot-desc">
                {{ autoPilotEnabled 
                  ? 'Harvey & Career-Ops AI analyze recipient intent, company & roles to write hyper-personalized emails on the fly. You do not need to write copy manually!' 
                  : 'Auto-Pilot is currently OFF. Leads will use manual templates or pre-drafted copies.' 
                }}
              </div>
            </div>
          </div>
          <div class="autopilot-right">
            <el-switch 
              v-model="autoPilotEnabled" 
              :loading="togglingAutoPilot"
              @change="handleToggleAutoPilot"
              active-text="Auto-Pilot ON"
              inactive-text="OFF"
              size="large"
              style="--el-switch-on-color: #10b981;"
            />
            <el-button size="small" type="primary" plain @click="openAutoPilotTestModal">
              <Icon icon="fluent:sparkle-16-regular" width="16" height="16" style="margin-right: 4px;" />
              Test AI Copywriter
            </el-button>
          </div>
          <div class="autoscout-bar" style="width: 100%; border-top: 1px dashed #cbd5e1; padding-top: 10px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <Icon icon="fluent:radar-24-filled" width="22" height="22" style="color: #6366f1;" />
              <div>
                <span style="font-size: 14px; font-weight: 700; color: #1e293b;">Autonomous Opportunity Scout (Lead-Free Mode)</span>
                <el-tag :type="autoScoutEnabled ? 'success' : 'info'" size="small" effect="plain" style="margin-left: 8px;">
                  {{ autoScoutEnabled ? 'ACTIVE: AUTO-SOURCING OPPORTUNITIES' : 'PAUSED (MANUAL)' }}
                </el-tag>
                <div style="font-size: 12.5px; color: #64748b; margin-top: 1px;">
                  Harvey & Career-Ops scout the web & sourcing radar to find high-match opportunities automatically. No manual lead list required!
                </div>
              </div>
            </div>
            <el-switch 
              v-model="autoScoutEnabled" 
              :loading="togglingAutoScout"
              @change="handleToggleAutoScout"
              active-text="Auto-Scout ON"
              inactive-text="OFF"
              size="default"
              style="--el-switch-on-color: #6366f1;"
            />
          </div>
        </div>

        <!-- FULL AUTONOMOUS AUTO MODE MASTER SUITE -->
        <div class="automode-master-card" :class="{ 'is-automode-active': autoModeEnabled }">
          <div class="automode-main-row">
            <div class="automode-left">
              <div class="automode-pulse-icon">
                <Icon :icon="autoModeEnabled ? 'fluent:sparkle-28-filled' : 'fluent:sparkle-28-regular'" width="28" height="28" />
              </div>
              <div class="automode-info">
                <div class="automode-title-row">
                  <span class="automode-title">Full Autonomous Auto Mode</span>
                  <el-tag :type="autoModeEnabled ? 'success' : 'info'" effect="dark" round size="small">
                    {{ autoModeEnabled ? 'ACTIVE: SCOUTING & OUTREACHING ON SCHEDULE' : 'STANDBY (MANUAL DISPATCH)' }}
                  </el-tag>
                </div>
                <div class="automode-desc">
                  {{ autoModeEnabled 
                    ? 'Autonomous hands-free loop is RUNNING. It checks for new job & client opportunities periodically, drafts personalized cold emails with AI, and sends them across 20 inboxes rotating through 4 domains.'
                    : 'Turn on Auto Mode to let Harvey and Career-Ops autonomously discover new opportunities from time to time, generate tailored pitches, and dispatch emails on autopilot.'
                  }}
                </div>
                <div class="automode-badges" v-if="autoModeEnabled">
                  <span class="auto-badge">
                    <Icon icon="fluent:clock-16-regular" width="14" height="14" />
                    Cadence: {{ autoModeConfig.schedule === 'twice_daily' ? 'Twice a Day (9 AM & 6 PM Deep Scan)' : (autoModeConfig.schedule === 'once_daily' ? 'Once a Day' : (autoModeConfig.schedule === 'every_6h' ? 'Every 6 Hours' : 'Twice a Day (Deep Scan)')) }}
                  </span>
                  <span class="auto-badge" style="color: #4f46e5; background: #eef2ff;">
                    <Icon icon="fluent:radar-16-filled" width="14" height="14" />
                    Depth: {{ autoModeConfig.searchDepth === 'fast' ? 'Fast Scan' : 'Deep Search (Max Yield: 20-50+ leads)' }}
                  </span>
                  <span class="auto-badge" style="color: #059669; background: #ecfdf5;">
                    <Icon icon="fluent:person-clock-16-regular" width="14" height="14" />
                    Human Delay: {{ autoModeConfig.delayMode === 'human_cautious' ? '60s–120s' : (autoModeConfig.delayMode === 'human_fast' ? '15s–30s' : '30s–60s Jitter') }} (Anti-Blasting)
                  </span>
                  <span class="auto-badge" style="color: #0284c7; background: #f0f9ff;">
                    <Icon icon="fluent:globe-clock-16-regular" width="14" height="14" />
                    Country Business Hours: 9:00 AM – 5:00 PM (Local Time)
                  </span>
                  <span class="auto-badge">
                    <Icon icon="fluent:target-16-regular" width="14" height="14" />
                    Target: {{ autoModeConfig.target === 'both' ? 'Jobs (Career-Ops) + Clients (Harvey)' : (autoModeConfig.target === 'jobs' ? 'Jobs Only' : 'Clients Only') }}
                  </span>
                  <span class="auto-badge" v-if="autoModeLastRun">
                    <Icon icon="fluent:checkmark-circle-16-regular" width="14" height="14" />
                    Last Run: {{ autoModeLastRun.dispatched || 0 }} sent, {{ (autoModeLastRun.jobsDiscovered || 0) + (autoModeLastRun.clientsDiscovered || 0) }} sourced
                  </span>
                </div>
              </div>
            </div>
            <div class="automode-right">
              <el-switch 
                v-model="autoModeEnabled" 
                :loading="togglingAutoMode"
                @change="handleToggleAutoMode"
                active-text="Auto Mode ON"
                inactive-text="OFF"
                size="large"
                style="--el-switch-on-color: #10b981;"
              />
              <div class="automode-btns">
                <el-button 
                  type="success" 
                  size="small" 
                  :loading="runningAutoCycle" 
                  @click="handleRunAutoCycleNow(true)"
                >
                  <Icon icon="fluent:flash-sparkle-16-filled" width="16" height="16" style="margin-right: 4px;" />
                  ⚡ Run Deep Search & Outreach Now
                </el-button>
                <el-button 
                  size="small" 
                  @click="showAutoModeSettingsModal = true"
                >
                  <Icon icon="fluent:settings-16-regular" width="16" height="16" style="margin-right: 4px;" />
                  Cadence Settings
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Metric Stat Cards -->
        <div class="stats-grid stats-grid-6">
          <div class="stat-card">
            <div class="stat-icon-wrapper blue">
              <Icon icon="fluent:mail-all-24-filled" width="26" height="26" />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.total_leads || 0 }}</div>
              <div class="stat-label">Total Outreach Leads</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper orange">
              <Icon icon="fluent:clock-24-filled" width="26" height="26" />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.queued_count || 0 }}</div>
              <div class="stat-label">Queued in Buffer</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper green">
              <Icon icon="fluent:send-clock-24-filled" width="26" height="26" />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.sent_count || 0 }}</div>
              <div class="stat-label">Dispatched Outbound</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper purple">
              <Icon icon="fluent:chat-bubbles-question-24-filled" width="26" height="26" />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.replied_count || 0 }}</div>
              <div class="stat-label">Inbound Replies ({{ replyRate }}%)</div>
            </div>
          </div>

          <div class="stat-card" :class="{ 'card-bounce-warn': (deliverability.overall_bounce_rate || 0) > 2, 'card-bounce-crit': (deliverability.overall_bounce_rate || 0) > 5 }">
            <div class="stat-icon-wrapper red">
              <Icon icon="fluent:arrow-bounce-24-filled" width="26" height="26" />
            </div>
            <div class="stat-content">
              <div class="stat-value" :style="{ color: (deliverability.overall_bounce_rate || 0) > 5 ? '#ef4444' : ((deliverability.overall_bounce_rate || 0) > 2 ? '#f59e0b' : '#10b981') }">
                {{ deliverability.overall_bounce_rate || 0 }}%
              </div>
              <div class="stat-label">Bounce Rate ({{ deliverability.total_bounced || 0 }} bounced · Target &lt; 2%)</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper teal">
              <Icon icon="fluent:shield-checkmark-24-filled" width="26" height="26" />
            </div>
            <div class="stat-content">
              <div class="stat-value" :style="{ color: (deliverability.overall_health_score || 100) >= 80 ? '#10b981' : '#f59e0b' }">
                {{ deliverability.overall_health_score || 100 }}/100
              </div>
              <div class="stat-label">Deliverability Health ({{ deliverability.overall_spam_risk === 'low' ? 'Low Spam Risk' : 'Attention Needed' }})</div>
            </div>
          </div>
        </div>

        <!-- Unified Section Navigation -->
        <div class="tabs-quick-nav">
          <button 
            type="button" 
            class="tab-nav-pill" 
            :class="{ active: activeTab === 'campaigns' }" 
            @click="activeTab = 'campaigns'"
          >
            <Icon icon="fluent:rocket-20-regular" width="16" height="16" />
            <span>🚀 Campaigns & Inboxes</span>
          </button>
          <button 
            type="button" 
            class="tab-nav-pill highlight-inbox" 
            :class="{ active: activeTab === 'inbox' }" 
            @click="activeTab = 'inbox'"
          >
            <Icon icon="fluent:mail-inbox-all-24-filled" width="18" height="18" />
            <span>📬 Master Inbox</span>
            <span v-if="unreadInboxCount > 0" class="inbox-pill-badge">{{ unreadInboxCount }}</span>
          </button>
          <button 
            type="button" 
            class="tab-nav-pill" 
            :class="{ active: activeTab === 'job_hunting' }" 
            @click="activeTab = 'job_hunting'"
          >
            <Icon icon="fluent:briefcase-24-regular" width="16" height="16" />
            <span>💼 Career-Ops (Jobs)</span>
          </button>
          <button 
            type="button" 
            class="tab-nav-pill" 
            :class="{ active: activeTab === 'client_hunting' }" 
            @click="activeTab = 'client_hunting'"
          >
            <Icon icon="fluent:target-arrow-24-regular" width="16" height="16" />
            <span>🎯 Harvey (Clients)</span>
          </button>
          <button 
            type="button" 
            class="tab-nav-pill highlight-health" 
            :class="{ active: activeTab === 'health' }" 
            @click="activeTab = 'health'"
          >
            <Icon icon="fluent:shield-checkmark-20-filled" width="18" height="18" />
            <span>🛡️ Deliverability & Spam Health</span>
          </button>
          <button 
            type="button" 
            class="tab-nav-pill highlight-ai" 
            :class="{ active: activeTab === 'llm_engine' }" 
            @click="activeTab = 'llm_engine'"
          >
            <Icon icon="fluent:brain-circuit-20-regular" width="18" height="18" />
            <span>🤖 LLM AI Settings</span>
          </button>
          <button 
            type="button" 
            class="tab-nav-pill highlight-tg" 
            :class="{ active: activeTab === 'replies' }" 
            @click="activeTab = 'replies'"
          >
            <Icon icon="fluent:alert-badge-20-regular" width="18" height="18" />
            <span>🔔 Telegram Alerts</span>
          </button>
          <button 
            type="button" 
            class="tab-nav-pill" 
            :class="{ active: activeTab === 'leads' }" 
            @click="activeTab = 'leads'"
          >
            <Icon icon="fluent:people-list-20-regular" width="16" height="16" />
            <span>📋 Leads Queue</span>
          </button>
        </div>

        <!-- Main Tabbed Control Navigation -->
        <el-tabs v-model="activeTab" class="outreach-tabs">
          
          <!-- TAB 1: Campaigns & Sending Infrastructure -->
          <el-tab-pane label="🚀 Campaigns & Inboxes" name="campaigns">
            
            <!-- Infrastructure Overview -->
            <div class="section-card">
              <div class="section-header">
                <div class="section-title">
                  <Icon icon="fluent:server-multiple-20-regular" width="20" height="20" />
                  <span>Sending Infrastructure & Mailbox Rotation</span>
                </div>
                <el-tag type="success" effect="dark" round>4 Domains Active • 20 Inboxes Configured</el-tag>
              </div>

              <div class="domains-grid">
                <div class="domain-card" v-for="d in domainCards" :key="d.domain">
                  <div class="domain-top">
                    <div class="domain-name">{{ d.domain }}</div>
                    <el-tag size="small" :type="d.providerType === 'resend' ? 'primary' : 'warning'">{{ d.provider }}</el-tag>
                  </div>
                  <div class="domain-meta">
                    <span class="status-indicator"></span>
                    <span>{{ d.inboxesCount }} sender inboxes (Tasin Sohad)</span>
                  </div>
                  <div class="domain-footer">
                    <span class="meta-tag">SPF / DKIM Authenticated</span>
                    <span class="meta-tag">301 Web Redirect &rarr; corevibeai.com</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Inbox Daily Sending Limits & Quota Protection -->
            <div class="section-card">
              <div class="section-header">
                <div class="section-title">
                  <Icon icon="fluent:mail-clock-20-regular" width="20" height="20" />
                  <span>Inbox Daily Sending Limits & Quota Protection</span>
                </div>
                <div class="inbox-batch-controls">
                  <span class="batch-label">Set Limit:</span>
                  <el-input-number 
                    v-model="batchLimitVal" 
                    :min="1" 
                    :max="500" 
                    size="small" 
                    style="width: 100px; margin-right: 8px;" 
                  />
                  <el-button 
                    type="primary" 
                    size="small" 
                    :loading="applyingBatchLimit"
                    @click="handleApplyBatchLimit"
                  >
                    Apply to {{ inboxesDomainFilter === 'all' ? 'All Inboxes' : inboxesDomainFilter }}
                  </el-button>
                </div>
              </div>

              <div class="inbox-filter-bar">
                <el-radio-group v-model="inboxesDomainFilter" size="small">
                  <el-radio-button value="all">All Domains (20)</el-radio-button>
                  <el-radio-button value="technetocrat.org">technetocrat.org</el-radio-button>
                  <el-radio-button value="swiftsuretech.com">swiftsuretech.com</el-radio-button>
                  <el-radio-button value="nccwtech.com">nccwtech.com</el-radio-button>
                  <el-radio-button value="saiftechnology.com">saiftechnology.com</el-radio-button>
                </el-radio-group>
              </div>

              <el-table :data="filteredInboxes" style="width: 100%" stripe class="inboxes-table">
                <el-table-column prop="email" label="Inbox Email" min-width="210">
                  <template #default="{ row }">
                    <div class="inbox-cell">
                      <div class="inbox-email">{{ row.email }}</div>
                      <div class="inbox-name">{{ row.name || 'Tasin Sohad' }}</div>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="Relay Provider" width="150">
                  <template #default="{ row }">
                    <el-tag 
                      size="small" 
                      :type="['nccwtech.com', 'saiftechnology.com'].some(d => row.email.endsWith('@' + d)) ? 'warning' : 'primary'"
                    >
                      {{ ['nccwtech.com', 'saiftechnology.com'].some(d => row.email.endsWith('@' + d)) ? 'Brevo API' : 'Resend' }}
                    </el-tag>
                  </template>
                </el-table-column>

                <el-table-column label="Today's Outbound Quota" min-width="190">
                  <template #default="{ row }">
                    <div class="quota-usage">
                      <div class="quota-numbers">
                        <span><strong>{{ row.sent_today || 0 }}</strong> / {{ row.daily_send_limit || 30 }} sent</span>
                        <span class="quota-rem" :class="{ 'quota-exhausted': (row.remaining || 0) <= 0 }">
                          {{ row.remaining !== undefined ? row.remaining : Math.max(0, (row.daily_send_limit || 30) - (row.sent_today || 0)) }} left
                        </span>
                      </div>
                      <el-progress 
                        :percentage="Math.min(100, Math.round(((row.sent_today || 0) / (row.daily_send_limit || 30)) * 100))"
                        :status="(row.sent_today || 0) >= (row.daily_send_limit || 30) ? 'exception' : ((row.sent_today || 0) / (row.daily_send_limit || 30) > 0.8 ? 'warning' : 'success')"
                        :show-text="false"
                        :stroke-width="6"
                      />
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="Bounce Rate" width="140" align="center">
                  <template #default="{ row }">
                    <div class="bounce-cell">
                      <el-tag 
                        size="small" 
                        :type="(row.bounce_rate || 0) > 5 ? 'danger' : ((row.bounce_rate || 0) > 2 ? 'warning' : 'success')"
                      >
                        {{ row.bounce_rate || 0 }}%
                      </el-tag>
                      <div class="sub-bounce-count">{{ row.bounced_count || 0 }} / {{ row.total_sent || 0 }} bounced</div>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="Health & Spam Risk" width="160" align="center">
                  <template #default="{ row }">
                    <div class="health-cell">
                      <el-tag 
                        size="small" 
                        :type="(row.health_score || 100) >= 90 ? 'success' : ((row.health_score || 100) >= 75 ? 'info' : ((row.health_score || 100) >= 50 ? 'warning' : 'danger'))"
                        effect="light"
                      >
                        {{ row.health_score || 100 }}/100 · {{ row.spam_risk === 'low' ? 'Low Risk' : (row.spam_risk === 'moderate' ? 'Moderate' : 'Critical') }}
                      </el-tag>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="Daily Sending Limit" width="190" align="center">
                  <template #default="{ row }">
                    <div class="limit-input-wrapper">
                      <el-input-number 
                        v-model="row.tempLimit" 
                        :min="1" 
                        :max="500" 
                        size="small" 
                        controls-position="right"
                        style="width: 90px; margin-right: 6px;"
                      />
                      <el-button 
                        type="primary" 
                        size="small" 
                        plain
                        :loading="row.saving"
                        :disabled="row.tempLimit === row.daily_send_limit"
                        @click="handleSaveInboxLimit(row)"
                      >
                        Save
                      </el-button>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="Status" width="130" align="center">
                  <template #default="{ row }">
                    <el-tag 
                      size="small" 
                      :type="(row.sent_today || 0) >= (row.daily_send_limit || 30) ? 'danger' : 'success'"
                    >
                      {{ (row.sent_today || 0) >= (row.daily_send_limit || 30) ? 'Limit Reached' : 'Active' }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- Active Campaigns List -->
            <div class="section-card">
              <div class="section-header">
                <div class="section-title">
                  <Icon icon="fluent:target-arrow-20-regular" width="20" height="20" />
                  <span>Outreach Campaigns</span>
                </div>
                <el-button type="primary" size="small" @click="openCreateCampaignDialog">
                  <Icon icon="fluent:add-16-filled" width="16" height="16" style="margin-right: 4px;" />
                  New Campaign
                </el-button>
              </div>

              <div class="campaigns-grid">
                <div class="campaign-box" v-for="c in campaigns" :key="c.campaign_id">
                  <div class="campaign-top">
                    <div>
                      <div class="campaign-title">
                        {{ c.type === 'job_hunting' ? '🎯' : '🚀' }} {{ c.name }}
                      </div>
                      <div class="campaign-desc">
                        {{ c.type === 'job_hunting' ? 'Job Hunting & Recruiter Outreach (Career-Ops)' : 'B2B Client Acquisition (Harvey)' }}
                      </div>
                    </div>
                    <el-switch 
                      v-model="c.activeBool" 
                      @change="handleCampaignToggle(c)"
                      active-text="Active"
                      inactive-text="Paused"
                    />
                  </div>

                  <div class="campaign-controls">
                    <div class="control-item">
                      <span class="control-label">Daily Limit:</span>
                      <el-input-number 
                        v-model="c.daily_limit" 
                        :min="1" 
                        :max="100" 
                        size="small"
                        @change="handleDailyLimitChange(c)" 
                      />
                    </div>
                    <div class="campaign-actions">
                      <el-button size="small" @click="openEditCampaign(c)">Settings</el-button>
                      <el-button size="small" type="danger" text @click="handleDeleteCampaign(c)">Delete</el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </el-tab-pane>


          <!-- TAB 1.5: Master Inbox & Autonomous Reply Hub -->
          <el-tab-pane label="📬 Master Inbox" name="inbox">
            <div class="section-card">
              <div class="section-header">
                <div class="section-title">
                  <Icon icon="fluent:mail-inbox-all-24-filled" width="22" height="22" style="color: #6366f1;" />
                  <span>Master Inbox & Autonomous Inbound Reply Hub</span>
                </div>
                <div class="inbox-header-actions">
                  <el-button size="small" :loading="loadingMasterInbox" @click="loadMasterInbox">
                    <Icon icon="fluent:arrow-sync-20-regular" width="16" height="16" style="margin-right: 4px;" />
                    Refresh Inbox
                  </el-button>
                  <el-button size="small" type="danger" plain :loading="purgingDead" @click="handlePurgeDeadLeads">
                    <Icon icon="fluent:broom-20-regular" width="16" height="16" style="margin-right: 4px;" />
                    Purge Dead Leads (MX Check)
                  </el-button>
                </div>
              </div>

              <!-- Top KPI Bar for Master Inbox -->
              <div class="inbox-metrics-row">
                <div class="inbox-kpi-pill">
                  <span class="ik-label">Total Inbound</span>
                  <span class="ik-value">{{ masterInboxTotal }}</span>
                </div>
                <div class="inbox-kpi-pill">
                  <span class="ik-label">Unread Replies</span>
                  <span class="ik-value unread">{{ unreadInboxCount }}</span>
                </div>
                <div class="inbox-kpi-pill">
                  <span class="ik-label">Prospect Responses</span>
                  <span class="ik-value prospect">{{ prospectRepliesCount }}</span>
                </div>
                <div class="inbox-kpi-pill">
                  <span class="ik-label">Live Inboxes Monitored</span>
                  <span class="ik-value">20 Senders (4 Domains)</span>
                </div>
              </div>

              <!-- Filter Bar -->
              <div class="inbox-filter-bar">
                <el-input 
                  v-model="inboxFilters.search" 
                  placeholder="Search prospect, company, subject, or message text..." 
                  clearable 
                  size="default" 
                  style="max-width: 380px;" 
                  @input="handleInboxSearch"
                >
                  <template #prefix>
                    <Icon icon="fluent:search-20-regular" />
                  </template>
                </el-input>

                <el-select 
                  v-model="inboxFilters.domain" 
                  placeholder="Filter by Domain" 
                  clearable 
                  style="width: 220px;" 
                  @change="loadMasterInbox"
                >
                  <el-option label="All Receiving Domains" value="" />
                  <el-option label="technetocrat.org (Resend)" value="technetocrat.org" />
                  <el-option label="swiftsuretech.com (Resend)" value="swiftsuretech.com" />
                  <el-option label="nccwtech.com (Brevo)" value="nccwtech.com" />
                  <el-option label="saiftechnology.com (Brevo)" value="saiftechnology.com" />
                </el-select>

                <div class="intent-chips">
                  <button 
                    type="button" 
                    class="intent-chip" 
                    :class="{ active: inboxFilters.intent === 'all' }" 
                    @click="setIntentFilter('all')"
                  >
                    All Inbound
                  </button>
                  <button 
                    type="button" 
                    class="intent-chip" 
                    :class="{ active: inboxFilters.intent === 'prospects' }" 
                    @click="setIntentFilter('prospects')"
                  >
                    ⚡ Prospect Replies
                  </button>
                  <button 
                    type="button" 
                    class="intent-chip" 
                    :class="{ active: inboxFilters.intent === 'interview' }" 
                    @click="setIntentFilter('interview')"
                  >
                    📅 Interviews / Calls
                  </button>
                  <button 
                    type="button" 
                    class="intent-chip" 
                    :class="{ active: inboxFilters.intent === 'ticket' }" 
                    @click="setIntentFilter('ticket')"
                  >
                    🎫 Ticket / Careers Portals
                  </button>
                  <button 
                    type="button" 
                    class="intent-chip" 
                    :class="{ active: inboxFilters.intent === 'interested' }" 
                    @click="setIntentFilter('interested')"
                  >
                    💡 High Interest
                  </button>
                </div>
              </div>

              <!-- Inbound Messages Table -->
              <el-table 
                :data="filteredMasterInboxList" 
                v-loading="loadingMasterInbox" 
                style="width: 100%; margin-top: 14px;" 
                stripe 
                class="master-inbox-table"
              >
                <el-table-column label="Prospect / Sender" min-width="210">
                  <template #default="{ row }">
                    <div class="inbound-sender-cell">
                      <div class="inbound-sender-name">
                        <strong>{{ row.target_name || row.sender_name || row.send_email?.split('@')[0] }}</strong>
                        <el-tag v-if="row.isProspect" size="small" type="success" effect="dark" style="margin-left: 6px;">
                          PROSPECT
                        </el-tag>
                      </div>
                      <div class="inbound-sender-email">{{ row.send_email }}</div>
                      <div v-if="row.company" class="inbound-company-tag">
                        🏢 {{ row.company }}
                      </div>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="Subject & Snippet" min-width="320">
                  <template #default="{ row }">
                    <div class="inbound-subject-cell" @click="openThread(row)">
                      <div class="inbound-subject-text" :class="{ 'is-unread': row.email_status === 0 }">
                        <span v-if="row.email_status === 0" class="unread-dot"></span>
                        {{ row.subject || '(no subject)' }}
                      </div>
                      <div class="inbound-snippet">
                        {{ row.text ? (row.text.length > 120 ? row.text.slice(0, 120) + '...' : row.text) : '(empty body)' }}
                      </div>
                      <div v-if="row.campaign_name" class="inbound-camp-name">
                        Campaign: {{ row.campaign_name }}
                      </div>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="Intent & Classification" width="170" align="center">
                  <template #default="{ row }">
                    <el-tag 
                      size="small" 
                      :type="row.intent === 'interview' ? 'success' : (row.intent === 'ticket' ? 'warning' : (row.intent === 'interested' ? 'primary' : (row.intent === 'uninterested' ? 'danger' : 'info')))"
                    >
                      {{ 
                        row.intent === 'interview' ? '📅 Interview / Call' :
                        row.intent === 'ticket' ? '🎫 Careers Ticket' :
                        row.intent === 'interested' ? '💡 High Interest' :
                        row.intent === 'uninterested' ? '⛔ Uninterested' :
                        (row.isProspect ? '💬 Prospect Reply' : '📩 Inbound')
                      }}
                    </el-tag>
                  </template>
                </el-table-column>

                <el-table-column label="Receiving Mailbox" width="220">
                  <template #default="{ row }">
                    <div class="receiving-cell">
                      <div class="receiving-email">{{ row.to_email }}</div>
                      <el-tag size="small" effect="plain" type="info">
                        {{ row.to_email?.split('@')[1] }}
                      </el-tag>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="Received At" width="160" align="center">
                  <template #default="{ row }">
                    <span class="inbox-time">{{ formatDate(row.create_time) }}</span>
                  </template>
                </el-table-column>

                <el-table-column label="Action" width="140" align="center" fixed="right">
                  <template #default="{ row }">
                    <el-button size="small" type="primary" plain @click="openThread(row)">
                      <Icon icon="fluent:chat-bubbles-question-16-regular" width="14" height="14" style="margin-right: 4px;" />
                      View &amp; Reply
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>

              <!-- Pagination -->
              <div class="pagination-wrapper" style="margin-top: 16px; display: flex; justify-content: flex-end;">
                <el-pagination 
                  v-model:current-page="inboxFilters.page" 
                  v-model:page-size="inboxFilters.size" 
                  :total="masterInboxTotal" 
                  :page-sizes="[15, 30, 50, 100]" 
                  layout="total, sizes, prev, pager, next" 
                  @size-change="loadMasterInbox" 
                  @current-change="loadMasterInbox" 
                />
              </div>
            </div>
          </el-tab-pane>

          <!-- TAB 2: Job Hunting Controls (Career-Ops) -->
          <el-tab-pane label="💼 Job Hunting Controls" name="job_hunting">
            <div class="section-card">
              <div class="section-header">
                <div class="section-title">
                  <Icon icon="fluent:hat-graduation-24-regular" width="22" height="22" style="color: #1677ff;" />
                  <span>Career-Ops Job Hunting Engine Controls</span>
                </div>
                <el-button type="primary" :loading="savingJobControls" @click="saveJobHuntingControls">
                  Save Job Hunting Parameters
                </el-button>
              </div>

              <div class="scout-action-banner" style="background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%); border: 1px solid #bfdbfe; border-radius: 12px; padding: 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <Icon icon="fluent:radar-rectangle-20-filled" width="22" height="22" style="color: #2563eb;" />
                    <span style="font-size: 16px; font-weight: 700; color: #1e3a8a;">Career-Ops Autonomous Opportunity Scout</span>
                    <el-tag size="small" type="primary" effect="dark">Zero Lead List Required</el-tag>
                  </div>
                  <div style="font-size: 13px; color: #1e40af; max-width: 650px;">
                    Scouts tech companies and finds active hiring managers and technical recruiters recruiting for your target roles ({{ jobForm.targetRoles || 'AI / Full-Stack' }}). Discovered prospects are automatically verified and queued!
                  </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <el-button type="primary" :loading="scoutingCareer" @click="handleScoutCareerOps(5)">
                    <Icon icon="fluent:sparkle-20-regular" width="18" height="18" style="margin-right: 6px;" />
                    Scout 5 Job Leads
                  </el-button>
                  <el-button type="primary" plain :loading="scoutingCareer" @click="handleScoutCareerOps(10)">
                    Scout 10 Leads
                  </el-button>
                </div>
              </div>

              <p class="section-help-text">
                Controls target roles, resume links, and custom pitch hooks for automated recruiter and hiring manager outreach.
              </p>

              <el-form label-position="top">
                <div class="form-row">
                  <el-form-item label="Target Job Roles" class="flex-1">
                    <el-input 
                      v-model="jobForm.targetRoles" 
                      placeholder="e.g. Senior Full-Stack Engineer, AI Agent Engineer, Solutions Architect" 
                    />
                  </el-form-item>
                  <el-form-item label="Preferred Locations & Timezones" class="flex-1">
                    <el-input 
                      v-model="jobForm.targetRegions" 
                      placeholder="e.g. US Remote (EST/PST), EU Remote (GMT/CET), Global Remote" 
                    />
                  </el-form-item>
                </div>

                <div class="form-row">
                  <el-form-item label="Live Resume / CV Link" class="flex-1">
                    <el-input 
                      v-model="jobForm.resumeUrl" 
                      placeholder="https://drive.google.com/file/d/..." 
                    />
                  </el-form-item>
                  <el-form-item label="Portfolio / GitHub Profile" class="flex-1">
                    <el-input 
                      v-model="jobForm.portfolioUrl" 
                      placeholder="github.com/tasinsohad | linkedin.com/in/tasinsohad" 
                    />
                  </el-form-item>
                </div>

                <el-form-item label="Core Pitch Hook & Experience Highlights">
                  <el-input 
                    type="textarea" 
                    :rows="4" 
                    v-model="jobForm.pitchFocus" 
                    placeholder="e.g. I build software with autonomous AI agents and modern vibe coding (Claude Code, Antigravity, Cursor) — shipping production systems in days rather than months. Live products: ITAD CRM (itadcrm.com), sandhan.xyz..."
                  />
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <!-- TAB 3: Harvey Client Hunting Controls -->
          <el-tab-pane label="🎯 Client Hunting Controls" name="client_hunting">
            <div class="section-card">
              <div class="section-header">
                <div class="section-title">
                  <Icon icon="fluent:briefcase-24-regular" width="22" height="22" style="color: #52c41a;" />
                  <span>Harvey Client Acquisition Controls</span>
                </div>
                <el-button type="primary" :loading="savingHarveyControls" @click="saveHarveyControls">
                  Save Client Hunting Parameters
                </el-button>
              </div>

              <div class="scout-action-banner" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <Icon icon="fluent:target-arrow-20-filled" width="22" height="22" style="color: #059669;" />
                    <span style="font-size: 16px; font-weight: 700; color: #065f46;">Harvey Autonomous B2B Prospect Radar</span>
                    <el-tag size="small" type="success" effect="dark">Zero Lead List Required</el-tag>
                  </div>
                  <div style="font-size: 13px; color: #047857; max-width: 650px;">
                    Scouts B2B companies in your ICP ({{ harveyForm.icpIndustries || 'B2B SaaS / Tech' }}), analyzes operational pain points, and discovers key decision-makers ({{ harveyForm.targetTitles || 'CTO / VP Engineering' }}). Automatically verified and queued!
                  </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <el-button type="success" :loading="scoutingHarvey" @click="handleScoutHarvey(5)">
                    <Icon icon="fluent:radar-24-filled" width="18" height="18" style="margin-right: 6px;" />
                    Scout 5 B2B Prospects
                  </el-button>
                  <el-button type="success" plain :loading="scoutingHarvey" @click="handleScoutHarvey(10)">
                    Scout 10 Prospects
                  </el-button>
                </div>
              </div>

              <p class="section-help-text">
                Configures target ICP, decision-maker personas, service offerings, and booking call links for B2B client acquisition.
              </p>

              <el-form label-position="top">
                <div class="form-row">
                  <el-form-item label="Target ICP Industries" class="flex-1">
                    <el-input 
                      v-model="harveyForm.icpIndustries" 
                      placeholder="e.g. B2B SaaS, AI Startups, Digital Agencies, Logistics, Healthcare Tech" 
                    />
                  </el-form-item>
                  <el-form-item label="Target Company Size" class="flex-1">
                    <el-input 
                      v-model="harveyForm.companySizes" 
                      placeholder="e.g. 10-50 employees, 50-250 employees" 
                    />
                  </el-form-item>
                </div>

                <div class="form-row">
                  <el-form-item label="Target Decision Maker Titles" class="flex-1">
                    <el-input 
                      v-model="harveyForm.targetTitles" 
                      placeholder="e.g. Founder, CEO, CTO, VP Engineering, Head of AI, VP Operations" 
                    />
                  </el-form-item>
                  <el-form-item label="Call Booking Link / CTA" class="flex-1">
                    <el-input 
                      v-model="harveyForm.bookingUrl" 
                      placeholder="e.g. cal.com/tasinsohad or 15-minute quick sync" 
                    />
                  </el-form-item>
                </div>

                <el-form-item label="Service Offering & Value Proposition Pitch">
                  <el-input 
                    type="textarea" 
                    :rows="4" 
                    v-model="harveyForm.serviceOffering" 
                    placeholder="e.g. Dedicated AI Solution Architect & Builder taking AI integrations, workflow automations, and bespoke internal SaaS off your core engineering backlog. Cut manual operational drag by 80%..."
                  />
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <!-- TAB 4: Harvey LLM Engine (Anthropic, NVIDIA NIM, Google, OpenAI, OpenRouter, Custom) -->
          <el-tab-pane label="🤖 LLM AI Settings" name="llm_engine">
            <div class="section-card">
              <div class="section-header">
                <div class="section-title">
                  <Icon icon="fluent:brain-circuit-20-regular" width="22" height="22" style="color: #722ed1;" />
                  <span>Harvey Multi-Provider LLM Brain & Automatic Failover Engine</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <el-tag :type="activeLlmChain.length > 0 ? 'success' : 'warning'" size="large">
                    {{ activeLlmDisplay }}
                  </el-tag>
                </div>
              </div>

              <!-- Multi-Provider Failover Pool Visualizer -->
              <div class="failover-pool-card">
                <div class="failover-pool-header">
                  <div class="failover-title-row">
                    <Icon icon="fluent:arrow-sync-checkmark-20-regular" width="20" height="20" style="color: #059669;" />
                    <span class="failover-title">Active Failover Sequence & Auto-Switching Pool</span>
                  </div>
                  <span class="failover-subtitle">
                    Configure your API keys below. The engine attempts your selected model on Priority #1 first. If that model encounters rate limits (429), errors, or timeout, it automatically tries fallback models from the same API key. If all models on that provider fail, it seamlessly switches to your next active provider in real time.
                  </span>
                </div>

                <!-- Sequence Pipeline Flow -->
                <div class="failover-pipeline">
                  <template v-if="activeLlmChain.length > 0">
                    <div 
                      v-for="(prov, idx) in activeLlmChain" 
                      :key="prov.id" 
                      class="pipeline-node"
                    >
                      <div class="pipeline-node-content">
                        <div class="pipeline-rank-badge">
                          {{ idx === 0 ? 'Primary #1' : `Fallback #${idx + 1}` }}
                        </div>
                        <div class="pipeline-node-name">{{ prov.name }}</div>
                        <div class="pipeline-node-model">{{ prov.config?.selected_model || 'default' }}</div>
                        <div class="pipeline-node-actions">
                          <button 
                            type="button" 
                            class="node-arrow-btn" 
                            :disabled="idx === 0" 
                            title="Move Up in Priority"
                            @click="moveProvider(prov.id, 'up')"
                          >▲</button>
                          <button 
                            type="button" 
                            class="node-arrow-btn" 
                            :disabled="idx === activeLlmChain.length - 1" 
                            title="Move Down in Priority"
                            @click="moveProvider(prov.id, 'down')"
                          >▼</button>
                        </div>
                      </div>
                      <div class="pipeline-connector">
                        <Icon icon="fluent:arrow-right-20-regular" width="18" height="18" />
                      </div>
                    </div>
                  </template>

                  <!-- Ultimate Safeguard Node -->
                  <div class="pipeline-node final-fallback">
                    <div class="pipeline-node-content safety-net">
                      <div class="pipeline-rank-badge safety">Built-in Safety Net</div>
                      <div class="pipeline-node-name">Cloudflare Workers AI</div>
                      <div class="pipeline-node-model">llama-3.1-8b-fast</div>
                      <div class="pipeline-status-text">Zero-Downtime Fallback</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- AI System Prompt & Persona Instructions Customizer -->
              <div class="system-prompt-card">
                <div class="prompt-header">
                  <div class="prompt-title-row">
                    <div class="prompt-icon-box">
                      <Icon icon="fluent:document-sparkle-20-regular" width="22" height="22" style="color: #4f46e5;" />
                    </div>
                    <div>
                      <h3 class="prompt-heading">AI System Prompt & Persona Customizer</h3>
                      <div class="prompt-subheading">
                        Instruct your AI on persona, tone of voice, brevity rules, forbidden sales cliches, and call-to-action strategy. The system guarantees valid output format.
                      </div>
                    </div>
                  </div>
                  <div class="prompt-actions">
                    <el-button size="small" type="warning" plain :loading="resettingPrompt" @click="handleResetSystemPrompts">
                      <Icon icon="fluent:arrow-reset-20-regular" width="16" height="16" style="margin-right: 4px;" />
                      Reset to Default
                    </el-button>
                    <el-button size="small" type="primary" :loading="savingPrompt" @click="handleSaveSystemPrompts">
                      <Icon icon="fluent:save-20-regular" width="16" height="16" style="margin-right: 4px;" />
                      Save System Prompt
                    </el-button>
                  </div>
                </div>

                <!-- Persona Switcher -->
                <div class="prompt-mode-tabs">
                  <button 
                    type="button" 
                    class="mode-pill" 
                    :class="{ active: activePromptMode === 'service_outreach' }"
                    @click="activePromptMode = 'service_outreach'"
                  >
                    <Icon icon="fluent:briefcase-20-regular" width="16" height="16" />
                    <span>🚀 Harvey (Client Hunting) Persona</span>
                  </button>
                  <button 
                    type="button" 
                    class="mode-pill" 
                    :class="{ active: activePromptMode === 'job_hunting' }"
                    @click="activePromptMode = 'job_hunting'"
                  >
                    <Icon icon="fluent:hat-graduation-20-regular" width="16" height="16" />
                    <span>💼 Career-Ops (Job Hunting) Persona</span>
                  </button>
                  <button 
                    type="button" 
                    class="mode-pill" 
                    :class="{ active: activePromptMode === 'global' }"
                    @click="activePromptMode = 'global'"
                  >
                    <Icon icon="fluent:globe-20-regular" width="16" height="16" />
                    <span>🌐 Global Directive (Universal Fallback)</span>
                  </button>
                </div>

                <!-- Textarea for activePromptMode -->
                <div class="prompt-editor-wrapper">
                  <el-input 
                    v-model="systemPrompts[activePromptMode]" 
                    type="textarea" 
                    :rows="4"
                    placeholder="Enter custom AI system prompt instructions..."
                    class="system-prompt-textarea"
                  />
                </div>

                <!-- Dynamic Placeholders Bar -->
                <div class="variables-bar">
                  <span class="variables-label">Click to insert dynamic variable:</span>
                  <div class="variables-list">
                    <span class="var-badge" @click="insertVariable('{{targetName}}')">{{targetName}}</span>
                    <span class="var-badge" @click="insertVariable('{{company}}')">{{company}}</span>
                    <span class="var-badge" @click="insertVariable('{{offering}}')">{{offering}}</span>
                    <span class="var-badge" @click="insertVariable('{{pitch}}')">{{pitch}}</span>
                    <span class="var-badge" @click="insertVariable('{{roles}}')">{{roles}}</span>
                    <span class="var-badge" @click="insertVariable('{{portfolioUrl}}')">{{portfolioUrl}}</span>
                    <span class="var-badge" @click="insertVariable('{{resumeUrl}}')">{{resumeUrl}}</span>
                    <span class="var-badge" @click="insertVariable('{{bookingUrl}}')">{{bookingUrl}}</span>
                    <span class="var-badge" @click="insertVariable('{{icp}}')">{{icp}}</span>
                  </div>
                </div>
              </div>

              <!-- Provider Picker Buttons -->
              <div class="provider-selector-grid" style="margin-top: 20px;">
                <div 
                  v-for="p in llmProviders" 
                  :key="p.id" 
                  class="provider-select-card"
                  :class="{ 'is-active-tab': selectedProviderId === p.id, 'is-active-engine': p.config?.is_active }"
                  @click="selectLlmProvider(p.id)"
                >
                  <div class="provider-card-top">
                    <span class="provider-card-name">{{ p.name }}</span>
                    <el-tag v-if="p.config?.is_active" size="small" type="success" effect="dark">
                      Priority #{{ p.config?.priority ?? '-' }}
                    </el-tag>
                    <el-tag v-else size="small" type="info">Standby</el-tag>
                  </div>
                  <div class="provider-card-model">
                    {{ p.config?.selected_model || 'No model chosen' }}
                  </div>
                  <div class="provider-card-toggle" @click.stop>
                    <el-switch 
                      :model-value="Boolean(p.config?.is_active)"
                      @change="(val) => handleToggleProviderActive(p, val)"
                      size="small"
                      active-text="In Pool"
                      inactive-text="Off"
                    />
                  </div>
                </div>
              </div>

              <!-- Active Provider Configuration Form -->
              <div class="provider-config-box" v-if="currentLlm" style="margin-top: 20px;">
                <div class="config-header">
                  <div>
                    <h3 style="margin: 0; font-size: 16.5px; font-weight: 700; color: #1e293b;">
                      Configure {{ currentProviderMeta?.name }}
                    </h3>
                    <div style="font-size: 13px; color: #64748b; margin-top: 2px;">
                      Enter API key and discover models. Enable "Active in Failover Pool" to include in the automatic redundancy chain.
                    </div>
                  </div>
                  <el-switch 
                    v-model="currentLlm.isActiveBool" 
                    active-text="Active in Failover Pool" 
                  />
                </div>

                <el-form label-position="top" style="margin-top: 18px;">
                  <div class="form-row">
                    <el-form-item :label="currentProviderMeta?.name + ' API Key'" class="flex-2" required>
                      <el-input 
                        v-model="currentLlm.apiKey" 
                        placeholder="Paste your API key here..." 
                        show-password 
                      />
                    </el-form-item>

                    <el-form-item label="Failover Priority Order (1 = Primary, 2 = 1st Fallback...)" class="flex-1">
                      <el-input-number 
                        v-model="currentLlm.priority" 
                        :min="1" 
                        :max="20" 
                        style="width: 100%;" 
                      />
                    </el-form-item>
                  </div>

                  <el-form-item v-if="currentLlm.provider === 'custom'" label="Custom Base URL (OpenAI-compatible)" required>
                    <el-input 
                      v-model="currentLlm.baseUrl" 
                      placeholder="e.g. http://localhost:11434/v1 or https://api.together.xyz/v1" 
                    />
                  </el-form-item>

                  <!-- Fetch & Dropdown Row -->
                  <div class="model-selection-row">
                    <el-form-item label="Select AI Model" class="flex-1">
                      <el-select 
                        v-model="currentLlm.selectedModel" 
                        placeholder="Choose a model from dropdown..." 
                        filterable 
                        style="width: 100%;"
                      >
                        <el-option 
                          v-for="m in currentLlm.modelsList" 
                          :key="m.id" 
                          :label="m.name || m.id" 
                          :value="m.id" 
                        />
                      </el-select>
                    </el-form-item>

                    <div class="fetch-btn-col">
                      <el-button 
                        type="primary" 
                        plain 
                        :loading="fetchingModels" 
                        @click="handleFetchModels"
                      >
                        <Icon icon="fluent:arrow-download-20-regular" width="18" height="18" style="margin-right: 4px;" />
                        Fetch Available Models
                      </el-button>
                    </div>
                  </div>

                  <!-- Test Connection Feedback Banner -->
                  <div v-if="testConnectionResult" class="test-conn-banner" :class="testConnectionResult.success ? 'is-success' : 'is-error'">
                    <Icon :icon="testConnectionResult.success ? 'fluent:checkmark-circle-20-filled' : 'fluent:dismiss-circle-20-filled'" width="20" height="20" />
                    <div>
                      <div class="test-conn-title">{{ testConnectionResult.success ? 'API Connection Verified' : 'Connection Failed' }}</div>
                      <div class="test-conn-msg">{{ testConnectionResult.message || testConnectionResult.error }}</div>
                    </div>
                  </div>

                  <div class="save-llm-row" style="display: flex; gap: 12px; margin-top: 18px; justify-content: flex-end;">
                    <el-button 
                      type="success" 
                      plain
                      :loading="testingConnection" 
                      @click="handleTestConnection"
                    >
                      <Icon icon="fluent:plug-connected-20-regular" width="18" height="18" style="margin-right: 6px;" />
                      Test Connection & Ping
                    </el-button>

                    <el-button 
                      type="primary" 
                      :loading="savingLlm" 
                      @click="handleSaveLlmConfig"
                    >
                      <Icon icon="fluent:save-20-regular" width="18" height="18" style="margin-right: 6px;" />
                      Save {{ currentProviderMeta?.name }} Configuration
                    </el-button>
                  </div>
                </el-form>
              </div>

            </div>
          </el-tab-pane>

          <!-- TAB 5: Inbound Replies & Telegram Alerts -->
          <el-tab-pane label="🔔 Telegram Alert Settings" name="replies">
            <div class="two-column-row">
              
              <!-- Recent Replies -->
              <div class="section-card flex-1">
                <div class="section-header">
                  <div class="section-title">
                    <Icon icon="fluent:alert-badge-20-filled" width="20" height="20" style="color: #67c23a;" />
                    <span>Recent Inbound Replies</span>
                  </div>
                </div>

                <div v-if="recentReplies.length === 0" class="empty-state">
                  <Icon icon="fluent:mail-inbox-dismiss-24-regular" width="40" height="40" />
                  <p>No replies received yet. Outbound leads are queued for rotation.</p>
                </div>

                <div v-else class="replies-list">
                  <div class="reply-item" v-for="reply in recentReplies" :key="reply.lead_id">
                    <div class="reply-main">
                      <div class="reply-lead">
                        <strong>{{ reply.target_name || reply.target_email }}</strong>
                        <span v-if="reply.company" class="reply-company">@ {{ reply.company }}</span>
                      </div>
                      <div class="reply-subject">{{ reply.subject }}</div>
                      <div class="reply-meta">
                        <el-tag size="small" :type="reply.campaign_type === 'job_hunting' ? 'success' : 'primary'">
                          {{ reply.campaign_name }}
                        </el-tag>
                        <span class="reply-time">{{ formatDate(reply.reply_time) }}</span>
                      </div>
                    </div>
                    <el-button type="primary" size="small" @click="jumpToReply(reply)">
                      <Icon icon="fluent:arrow-reply-16-regular" width="16" height="16" style="margin-right: 4px;" />
                      Reply
                    </el-button>
                  </div>
                </div>
              </div>

              <!-- Telegram Alerts Configuration -->
              <div class="section-card flex-1">
                <div class="section-header">
                  <div class="section-title">
                    <Icon icon="fluent:chat-sparkle-20-regular" width="20" height="20" style="color: #409eff;" />
                    <span>Telegram 1-Click Reply Alerts</span>
                  </div>
                  <el-tag :type="telegramForm.configured ? 'success' : 'warning'" size="small">
                    {{ telegramForm.configured ? 'Connected' : 'Action Needed' }}
                  </el-tag>
                </div>

                <p class="tg-description">
                  When a lead replies to any of your 20 inboxes, Cloud Mailreach forwards the full context to your Telegram bot with a <strong>1-Click Reply</strong> button.
                </p>

                <el-form label-position="top" class="tg-form">
                  <el-form-item label="Telegram Bot Token">
                    <el-input 
                      v-model="telegramForm.tgBotToken" 
                      placeholder="e.g. 123456789:AAH..." 
                      show-password
                    />
                  </el-form-item>
                  <el-form-item label="Telegram Chat ID">
                    <el-input 
                      v-model="telegramForm.tgChatId" 
                      placeholder="e.g. 987654321" 
                    />
                  </el-form-item>
                  <div class="tg-btn-row">
                    <el-button type="primary" :loading="savingTg" @click="handleSaveTelegram">
                      Save Telegram Settings
                    </el-button>
                    <el-button type="default" :loading="testingTg" @click="handleTestTelegram">
                      <Icon icon="fluent:send-16-regular" width="16" height="16" style="margin-right: 4px;" />
                      Send Test Alert
                    </el-button>
                  </div>
                </el-form>
              </div>

            </div>
          </el-tab-pane>

          <!-- TAB 6: Leads Queue -->
          <el-tab-pane label="Leads Queue" name="leads">
            <div class="section-card">
              <div class="section-header">
                <div class="section-title">
                  <Icon icon="fluent:people-list-20-regular" width="20" height="20" />
                  <span>Outreach Leads Queue</span>
                </div>
                <div class="table-filters">
                  <el-select v-model="filterCampaign" placeholder="All Campaigns" style="width: 220px;" @change="loadLeads">
                    <el-option label="All Campaigns" value="" />
                    <el-option v-for="c in campaigns" :key="c.campaign_id" :label="c.name" :value="c.campaign_id" />
                  </el-select>
                  <el-select v-model="filterStatus" placeholder="All Statuses" style="width: 140px;" @change="loadLeads">
                    <el-option label="All Statuses" value="all" />
                    <el-option label="Queued" value="queued" />
                    <el-option label="Sent" value="sent" />
                    <el-option label="Replied" value="replied" />
                  </el-select>
                  <el-button 
                    type="danger" 
                    plain 
                    @click="handleClearAllLeads" 
                    :loading="loadingLeads"
                  >
                    <Icon icon="fluent:delete-dismiss-24-regular" style="margin-right: 4px;" />
                    Reset Stats / Clear Leads
                  </el-button>
                </div>
              </div>

              <el-table :data="leadsList" v-loading="loadingLeads" style="width: 100%" stripe>
                <el-table-column prop="target_email" label="Prospect Email" min-width="180" />
                <el-table-column prop="target_name" label="Name" min-width="120">
                  <template #default="{ row }">
                    {{ row.target_name || '-' }}
                  </template>
                </el-table-column>
                <el-table-column prop="company" label="Company" min-width="140">
                  <template #default="{ row }">
                    {{ row.company || '-' }}
                  </template>
                </el-table-column>
                <el-table-column label="Country & Local Time" min-width="210">
                  <template #default="{ row }">
                    <div style="display: flex; flex-direction: column; gap: 3px;">
                      <span style="font-weight: 600; font-size: 13px; color: #1e293b;">
                        {{ row.country || 'United States' }}
                      </span>
                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-size: 12px; color: #64748b; font-family: monospace;">
                          {{ row.local_time ? row.local_time + ' ' + (row.weekday || '') : '09:00 AM' }}
                        </span>
                        <el-tag size="small" :type="row.is_window_open !== false ? 'success' : 'warning'" effect="plain" round>
                          {{ row.is_window_open !== false ? '🟢 Open (9am–5pm)' : '🟡 Holding (Off-hours)' }}
                        </el-tag>
                      </div>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="campaign_name" label="Campaign" min-width="170">
                  <template #default="{ row }">
                    <el-tag size="small" :type="row.campaign_type === 'job_hunting' ? 'success' : 'primary'">
                      {{ row.campaign_name }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="sender_email" label="Dispatched From" min-width="180">
                  <template #default="{ row }">
                    <span v-if="row.sender_email">{{ row.sender_email }}</span>
                    <span v-else style="color: #999;">Rotates on send</span>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="Status" width="110">
                  <template #default="{ row }">
                    <el-tag :type="getStatusTag(row.status)">{{ row.status }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="Actions" width="100" align="center">
                  <template #default="{ row }">
                    <el-button type="danger" text size="small" @click="handleDeleteLead(row)">
                      Delete
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <!-- 6. Deliverability & Spam Health Suite Tab -->
          <el-tab-pane label="🛡️ Deliverability & Spam Health" name="health">
            <div class="deliverability-suite">
              
              <!-- Top Banner & Quick Metrics -->
              <div class="health-overview-card">
                <div class="health-overview-header">
                  <div class="health-overview-title-group">
                    <div class="health-shield-icon" :class="(deliverability.overall_health_score || 100) >= 80 ? 'shield-good' : 'shield-warn'">
                      <Icon icon="fluent:shield-checkmark-48-filled" width="32" height="32" />
                    </div>
                    <div>
                      <div class="health-title">Deliverability & Spam Placement Suite</div>
                      <div class="health-subtitle">Real-time bounce rate monitoring, domain DNS authentication (SPF, DKIM, DMARC), and spam placement defense for all 28 inboxes.</div>
                    </div>
                  </div>
                  <div class="health-header-actions">
                    <el-button type="primary" plain size="small" :loading="loadingHealth" @click="loadDeliverabilityHealth">
                      <Icon icon="fluent:arrow-sync-20-regular" width="15" height="15" style="margin-right: 5px;" />
                      Refresh DNS & Deliverability Audit
                    </el-button>
                  </div>
                </div>

                <div class="health-kpi-row">
                  <div class="health-kpi-box">
                    <div class="hk-label">Swarm Deliverability Score</div>
                    <div class="hk-value" :style="{ color: (deliverability.overall_health_score || 100) >= 80 ? '#10b981' : '#f59e0b' }">
                      {{ deliverability.overall_health_score || 100 }}<span class="hk-sub">/100</span>
                    </div>
                    <div class="hk-tag-row">
                      <el-tag size="small" :type="(deliverability.overall_health_score || 100) >= 80 ? 'success' : 'warning'">
                        {{ deliverability.overall_health_status_label || 'Pristine Health' }}
                      </el-tag>
                    </div>
                  </div>

                  <div class="health-kpi-box">
                    <div class="hk-label">Overall Bounce Rate</div>
                    <div class="hk-value" :style="{ color: (deliverability.overall_bounce_rate || 0) > 5 ? '#ef4444' : ((deliverability.overall_bounce_rate || 0) > 2 ? '#f59e0b' : '#10b981') }">
                      {{ deliverability.overall_bounce_rate || 0 }}%
                    </div>
                    <div class="hk-desc">
                      <strong>{{ deliverability.total_bounced || 0 }}</strong> hard bounces / {{ deliverability.total_sent || stats.sent_count || 0 }} sent (Target &lt; 2%)
                    </div>
                  </div>

                  <div class="health-kpi-box">
                    <div class="hk-label">Spam Complaints</div>
                    <div class="hk-value" :style="{ color: (deliverability.total_complained || 0) > 0 ? '#ef4444' : '#10b981' }">
                      {{ deliverability.total_complained || 0 }}
                    </div>
                    <div class="hk-desc">
                      Threshold &lt; 0.1% | Active Resend &amp; Brevo webhooks
                    </div>
                  </div>

                  <div class="health-kpi-box">
                    <div class="hk-label">Reply Engagement Rate</div>
                    <div class="hk-value" style="color: #6366f1;">
                      {{ deliverability.overall_reply_rate || replyRate }}%
                    </div>
                    <div class="hk-desc">
                      <strong>{{ deliverability.total_replied || stats.replied_count || 0 }}</strong> inbound replies received
                    </div>
                  </div>
                </div>
              </div>

              <!-- Critical DMARC Warning Notice if any domain missing DMARC -->
              <div v-if="hasDmarcIssue" class="dmarc-warning-banner">
                <div class="dw-icon">
                  <Icon icon="fluent:warning-28-filled" width="28" height="28" />
                </div>
                <div class="dw-content">
                  <div class="dw-title">⚠️ Action Required: DMARC Record Missing on Sending Domain</div>
                  <div class="dw-text">
                    Google and Yahoo strictly enforce DMARC authentication for all inbound cold emails. Without a valid DMARC record, emails from <code>technetocrat.org</code> and <code>swiftsuretech.com</code> risk landing in the <strong>Spam or Junk folder</strong>.
                  </div>
                  <div class="dw-action-box">
                    <div class="dw-dns-code">
                      <span class="dw-key">Record Type:</span> <code>TXT</code> &nbsp;|&nbsp; 
                      <span class="dw-key">Name:</span> <code>_dmarc</code> &nbsp;|&nbsp; 
                      <span class="dw-key">Value:</span> <code>v=DMARC1; p=none; sp=none; aspf=r;</code>
                    </div>
                    <el-button type="primary" size="small" @click="copyDmarcRecord">
                      <Icon icon="fluent:copy-16-regular" width="14" height="14" style="margin-right: 4px;" />
                      Copy DMARC TXT Record
                    </el-button>
                  </div>
                </div>
              </div>

              <!-- Section 1: Domain DNS Authentication Status -->
              <div class="health-card">
                <div class="health-card-header">
                  <div class="card-title-group">
                    <Icon icon="fluent:globe-shield-24-filled" width="20" height="20" class="section-icon blue" />
                    <div>
                      <h3 class="section-h3">1. Domain DNS Authentication &amp; SPF/DKIM/DMARC Live Status</h3>
                      <p class="section-sub">Verified in real time via Cloudflare DNS-over-HTTPS. All 3 records must pass for 100% inbox placement.</p>
                    </div>
                  </div>
                </div>

                <div class="domain-cards-grid">
                  <div v-for="dom in dnsDomains" :key="dom.domain" class="domain-dns-card" :class="{ 'dom-warning': !dom.dmarc?.ok || !dom.spf?.ok }">
                    <div class="dom-header">
                      <div class="dom-name">
                        <Icon icon="fluent:globe-20-regular" width="18" height="18" />
                        <span>{{ dom.domain }}</span>
                      </div>
                      <el-tag size="small" :type="dom.provider === 'Brevo' ? 'warning' : 'primary'">{{ dom.provider }}</el-tag>
                    </div>

                    <div class="dom-records">
                      <div class="record-row">
                        <span class="rec-label">SPF Record:</span>
                        <el-tag size="small" :type="dom.spf?.ok ? 'success' : 'danger'">
                          {{ dom.spf?.ok ? 'PASS (Configured)' : 'FAIL (Missing)' }}
                        </el-tag>
                      </div>
                      <div class="record-row">
                        <span class="rec-label">DKIM Signature:</span>
                        <el-tag size="small" type="success">PASS (Active)</el-tag>
                      </div>
                      <div class="record-row">
                        <span class="rec-label">DMARC Policy:</span>
                        <el-tag size="small" :type="dom.dmarc?.ok ? 'success' : 'danger'">
                          {{ dom.dmarc?.ok ? 'PASS (Aligned)' : 'ACTION REQUIRED' }}
                        </el-tag>
                      </div>
                    </div>

                    <div v-if="dom.recommendation" class="dom-rec-notice">
                      <Icon icon="fluent:info-16-regular" width="15" height="15" />
                      <span>{{ dom.recommendation }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Section 2: Inbox-by-Inbox Deliverability & Spam Scoreboard -->
              <div class="health-card">
                <div class="health-card-header">
                  <div class="card-title-group">
                    <Icon icon="fluent:mail-multiple-24-filled" width="20" height="20" class="section-icon indigo" />
                    <div>
                      <h3 class="section-h3">2. Mailbox Deliverability &amp; Bounce Rate Scoreboard (28 Inboxes)</h3>
                      <p class="section-sub">Detailed breakdown of total dispatched emails, bounces, calculated bounce rate %, and spam placement risk for each individual mailbox.</p>
                    </div>
                  </div>
                  <div class="inbox-search-wrap">
                    <el-input v-model="scoreboardSearch" placeholder="Search mailbox or domain..." clearable size="small" style="width: 240px;">
                      <template #prefix>
                        <Icon icon="fluent:search-20-regular" />
                      </template>
                    </el-input>
                  </div>
                </div>

                <el-table :data="filteredScoreboardInboxes" style="width: 100%" stripe class="health-table">
                  <el-table-column prop="email" label="Mailbox Address" min-width="220">
                    <template #default="{ row }">
                      <div class="inbox-cell">
                        <div class="inbox-email">{{ row.email }}</div>
                        <div class="inbox-name">{{ row.name || 'Tasin Sohad' }}</div>
                      </div>
                    </template>
                  </el-table-column>

                  <el-table-column label="Relay" width="110">
                    <template #default="{ row }">
                      <el-tag size="small" :type="['nccwtech.com', 'saiftechnology.com'].some(d => row.email.endsWith('@' + d)) ? 'warning' : 'primary'">
                        {{ ['nccwtech.com', 'saiftechnology.com'].some(d => row.email.endsWith('@' + d)) ? 'Brevo' : 'Resend' }}
                      </el-tag>
                    </template>
                  </el-table-column>

                  <el-table-column label="Total Dispatched" width="130" align="center">
                    <template #default="{ row }">
                      <strong>{{ row.total_sent || 0 }}</strong> sent
                    </template>
                  </el-table-column>

                  <el-table-column label="Bounces" width="140" align="center">
                    <template #default="{ row }">
                      <div class="bounce-cell">
                        <el-tag size="small" :type="(row.bounce_rate || 0) > 5 ? 'danger' : ((row.bounce_rate || 0) > 2 ? 'warning' : 'success')">
                          {{ row.bounce_rate || 0 }}%
                        </el-tag>
                        <span class="sub-bounce-count">{{ row.bounced_count || 0 }} bounced</span>
                      </div>
                    </template>
                  </el-table-column>

                  <el-table-column label="Replies &amp; Engagement" width="160" align="center">
                    <template #default="{ row }">
                      <div>
                        <strong>{{ row.replied_count || 0 }}</strong> replies
                        <div class="sub-bounce-count">{{ row.reply_rate || 0 }}% reply rate</div>
                      </div>
                    </template>
                  </el-table-column>

                  <el-table-column label="Deliverability Health" width="170" align="center">
                    <template #default="{ row }">
                      <div class="score-bar-wrapper">
                        <div class="score-val">{{ row.health_score || 100 }}/100</div>
                        <el-progress 
                          :percentage="row.health_score || 100" 
                          :status="(row.health_score || 100) >= 80 ? 'success' : ((row.health_score || 100) >= 50 ? 'warning' : 'exception')"
                          :show-text="false"
                          :stroke-width="5"
                        />
                      </div>
                    </template>
                  </el-table-column>

                  <el-table-column label="Spam Risk" width="130" align="center">
                    <template #default="{ row }">
                      <el-tag size="small" :type="row.spam_risk === 'low' ? 'success' : (row.spam_risk === 'moderate' ? 'warning' : 'danger')">
                        {{ row.spam_risk === 'low' ? 'Low Risk' : (row.spam_risk === 'moderate' ? 'Moderate' : 'Critical') }}
                      </el-tag>
                    </template>
                  </el-table-column>

                  <el-table-column label="Test Dispatch" width="130" align="center">
                    <template #default="{ row }">
                      <el-button size="small" plain type="primary" @click="openQuickTestModal(row.email)">
                        Test Send
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <!-- Section 3: How Cloud Mailreach Detects & Prevents Spam Placement Guide -->
              <div class="health-card">
                <div class="health-card-header">
                  <div class="card-title-group">
                    <Icon icon="fluent:lightbulb-filament-24-filled" width="20" height="20" class="section-icon amber" />
                    <div>
                      <h3 class="section-h3">3. How Cloud Mailreach Detects If Cold Emails Land In Spam</h3>
                      <p class="section-sub">Comprehensive diagnostic guide answering how mailbox health, bounce spikes, and silent filtering are detected.</p>
                    </div>
                  </div>
                </div>

                <div class="guide-cards-grid">
                  <div class="guide-card">
                    <div class="guide-header">
                      <div class="guide-number">01</div>
                      <div class="guide-title">Hard Bounce Rate Spike Threshold</div>
                    </div>
                    <div class="guide-body">
                      When hard bounces exceed <strong>2.0%</strong>, ESP reputation algorithms flag the sender. If it exceeds <strong>5.0%</strong>, major inboxes (Google Workspace, Microsoft Outlook 365) automatically route subsequent messages from that inbox straight to the Spam or Junk folder.
                    </div>
                    <div class="guide-status">
                      <span class="status-indicator safe"></span> Monitored per-inbox in real time
                    </div>
                  </div>

                  <div class="guide-card">
                    <div class="guide-header">
                      <div class="guide-number">02</div>
                      <div class="guide-title">Real-Time Spam Complaint Webhooks</div>
                    </div>
                    <div class="guide-body">
                      Whenever a prospect clicks "Report Spam" or "Mark as Junk", Resend and Brevo emit immediate webhook events (<code>email.complained</code>). Industry standard allows a maximum of <strong>0.1%</strong> (1 per 1,000 emails). At 0.3%, sending is paused and Telegram is notified.
                    </div>
                    <div class="guide-status">
                      <span class="status-indicator safe"></span> Active with instant Telegram alerts
                    </div>
                  </div>

                  <div class="guide-card">
                    <div class="guide-header">
                      <div class="guide-number">03</div>
                      <div class="guide-title">The "Cold Trap" Zero-Reply Heuristic</div>
                    </div>
                    <div class="guide-body">
                      When an inbox sends <strong>25+ personalized cold emails</strong> without a single reply while other inboxes in the swarm receive replies, the domain has likely been silently placed in Google's "Promotions" or "Spam" folder without generating a bounce.
                    </div>
                    <div class="guide-status">
                      <span class="status-indicator warn"></span> Monitored via reply engagement rate
                    </div>
                  </div>

                  <div class="guide-card">
                    <div class="guide-header">
                      <div class="guide-number">04</div>
                      <div class="guide-title">SPF &amp; DMARC DNS Alignment</div>
                    </div>
                    <div class="guide-body">
                      As of 2024, Google and Yahoo reject or spam-box any sender lacking a published DMARC policy. Both <code>technetocrat.org</code> and <code>swiftsuretech.com</code> must publish a DMARC TXT record in Cloudflare DNS to guarantee inbox placement.
                    </div>
                    <div class="guide-status">
                      <span class="status-indicator warn"></span> Live verified via Cloudflare DNS
                    </div>
                  </div>
                </div>
              </div>

              <!-- Section 4: Pre-Flight AI Spam Trigger Scanner & Live Test Dispatcher -->
              <div class="health-dual-grid">
                
                <!-- Pre-Flight Spam Scanner -->
                <div class="health-card">
                  <div class="health-card-header">
                    <div class="card-title-group">
                      <Icon icon="fluent:radar-24-filled" width="20" height="20" class="section-icon purple" />
                      <div>
                        <h3 class="section-h3">4. Pre-Flight Spam Trigger Scanner</h3>
                        <p class="section-sub">Scans cold email copy against 80+ cold email spam trigger keywords, excessive punctuation, and formatting traps before sending.</p>
                      </div>
                    </div>
                  </div>

                  <div class="scanner-presets">
                    <span class="preset-label">Load Template:</span>
                    <el-button size="small" text type="primary" @click="loadSampleForSpamCheck('job')">Career-Ops (Job Outreach)</el-button>
                    <el-button size="small" text type="primary" @click="loadSampleForSpamCheck('client')">Harvey (Client Outreach)</el-button>
                  </div>

                  <el-form label-position="top">
                    <el-form-item label="Target Recipient Email (Optional — Performs Live MX Deliverability Check)">
                      <el-input v-model="spamScanner.targetEmail" placeholder="e.g. alex@stripe.com (detects dead domains & verifies MX)" />
                    </el-form-item>

                    <el-form-item label="Email Subject Line">
                      <el-input v-model="spamScanner.subject" placeholder="e.g. Quick question regarding technical bottleneck at Stripe" />
                    </el-form-item>

                    <el-form-item label="Email Body Text">
                      <el-input 
                        v-model="spamScanner.body" 
                        type="textarea" 
                        :rows="5" 
                        placeholder="Paste cold email copy here to analyze spam trigger words and deliverability score..." 
                      />
                    </el-form-item>

                    <el-button type="primary" :loading="spamScanner.analyzing" @click="runSpamCheck">
                      <Icon icon="fluent:shield-search-20-regular" width="16" height="16" style="margin-right: 6px;" />
                      Scan Copy For Spam Triggers &amp; Predict Folder
                    </el-button>
                  </el-form>

                  <!-- Scanner Results -->
                  <div v-if="spamScanner.result" class="scanner-results-card">
                    <div class="scan-score-row">
                      <div class="scan-score-val" :style="{ color: spamScanner.result.spamScore > 40 ? '#ef4444' : (spamScanner.result.spamScore > 20 ? '#f59e0b' : '#10b981') }">
                        {{ spamScanner.result.spamScore }}<span class="score-sub">/100 Penalty</span>
                      </div>
                      <el-tag :type="spamScanner.result.level === 'clean' ? 'success' : (spamScanner.result.level === 'low_risk' ? 'info' : (spamScanner.result.level === 'moderate_risk' ? 'warning' : 'danger'))">
                        {{ spamScanner.result.level.replace('_', ' ').toUpperCase() }}
                      </el-tag>
                    </div>

                    <!-- Predicted Folder Placement Badge -->
                    <div v-if="spamScanner.result.predictedFolder" class="folder-prediction-card" :class="'fpc-' + (spamScanner.result.folderClass || 'primary')">
                      <div class="fpc-icon">
                        <Icon :icon="spamScanner.result.folderClass === 'primary' ? 'fluent:checkmark-circle-24-filled' : (spamScanner.result.folderClass === 'promotions' ? 'fluent:tag-24-filled' : 'fluent:alert-24-filled')" width="24" height="24" />
                      </div>
                      <div class="fpc-details">
                        <div class="fpc-title">Predicted ESP Folder Placement</div>
                        <div class="fpc-status">
                          <strong>{{ spamScanner.result.predictedFolder }}</strong>
                          <span class="fpc-sub" v-if="spamScanner.result.folderClass === 'primary'"> — Will land in recipient's Primary Inbox view</span>
                          <span class="fpc-sub" v-else-if="spamScanner.result.folderClass === 'promotions'"> — Filtered out of Primary inbox by ESP algorithms</span>
                          <span class="fpc-sub" v-else> — High penalty detected; will be blocked or sent to Junk/Spam</span>
                        </div>
                      </div>
                    </div>

                    <!-- Target Recipient MX Check Status -->
                    <div v-if="spamScanner.result.targetMxInfo" class="mx-check-status-box" :class="{ 'mx-pass': spamScanner.result.targetMxInfo.hasMx, 'mx-fail': !spamScanner.result.targetMxInfo.hasMx }">
                      <Icon :icon="spamScanner.result.targetMxInfo.hasMx ? 'fluent:shield-checkmark-20-filled' : 'fluent:dismiss-circle-20-filled'" width="20" height="20" />
                      <div>
                        <strong>Target Domain MX: {{ spamScanner.result.targetMxInfo.domain }}</strong>
                        <div style="font-size: 12.5px;">{{ spamScanner.result.targetMxInfo.status }}</div>
                      </div>
                    </div>

                    <div v-if="spamScanner.result.detectedTriggers && spamScanner.result.detectedTriggers.length > 0" class="triggers-detected-box">
                      <div class="trigger-box-title">Spam Triggers Detected:</div>
                      <div class="trigger-tags-list">
                        <el-tag v-for="(tr, idx) in spamScanner.result.detectedTriggers" :key="idx" type="danger" size="small" effect="plain">
                          {{ tr.trigger }} ({{ tr.location }}: +{{ tr.penalty }})
                        </el-tag>
                      </div>
                    </div>

                    <div class="scan-suggestions-box">
                      <div class="sugg-title">Deliverability Optimization:</div>
                      <ul class="sugg-list">
                        <li v-for="(sugg, sIdx) in spamScanner.result.suggestions" :key="sIdx">{{ sugg }}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <!-- Live Test Dispatcher -->
                <div class="health-card">
                  <div class="health-card-header">
                    <div class="card-title-group">
                      <Icon icon="fluent:send-24-filled" width="20" height="20" class="section-icon green" />
                      <div>
                        <h3 class="section-h3">5. Live Inbox Placement Test Dispatcher</h3>
                        <p class="section-sub">Dispatch a diagnostic placement test email to your personal Gmail or Outlook inbox to verify whether it lands in Primary Inbox or Spam.</p>
                      </div>
                    </div>
                  </div>

                  <el-form label-position="top">
                    <el-form-item label="Select Sending Mailbox (From Pool of 28)">
                      <el-select v-model="testSendForm.fromEmail" placeholder="Select inbox to test..." style="width: 100%;">
                        <el-option v-for="inb in inboxes" :key="inb.email" :label="inb.email" :value="inb.email" />
                      </el-select>
                    </el-form-item>

                    <el-form-item label="Destination Test Address (Your Personal Gmail/Outlook)" required>
                      <el-input v-model="testSendForm.testEmail" placeholder="e.g. yourname@gmail.com" />
                    </el-form-item>

                    <div class="test-send-instructions">
                      <div class="ins-title">How to inspect test results:</div>
                      <ol class="ins-steps">
                        <li>Send diagnostic email to your personal address.</li>
                        <li>Check if it arrives in <strong>Primary Inbox</strong>, <strong>Promotions</strong>, or <strong>Spam</strong>.</li>
                        <li>Click <em>"Show Original"</em> (Gmail) to verify: <code>SPF: PASS</code>, <code>DKIM: PASS</code>, <code>DMARC: PASS</code>.</li>
                      </ol>
                    </div>

                    <el-button type="success" :loading="testSendForm.sending" @click="handleSendDeliverabilityTest(null)">
                      <Icon icon="fluent:send-clock-20-filled" width="16" height="16" style="margin-right: 6px;" />
                      Dispatch Diagnostic Test Email
                    </el-button>
                  </el-form>
                </div>

              </div>

            </div>
          </el-tab-pane>

        </el-tabs>

      </div>
    </el-scrollbar>

    <!-- Dialog: Create Campaign (+ Lead List) -->
    <el-dialog v-model="showCreateCampaignModal" title="Create New Campaign & Queue Leads" width="680px">
      <el-form label-position="top">
        <el-form-item label="Campaign Name" required>
          <el-input v-model="createCampForm.name" placeholder="e.g. Fintech CTO Acquisition or Senior AI Engineer Roles" />
        </el-form-item>

        <div class="form-row">
          <el-form-item label="Campaign Objective" class="flex-1" required>
            <el-select v-model="createCampForm.type" style="width: 100%;">
              <el-option value="job_hunting" label="🎯 Job Hunting (Career-Ops)" />
              <el-option value="service_outreach" label="🚀 Client Acquisition (Harvey)" />
            </el-select>
          </el-form-item>
          <el-form-item label="Daily Send Quota" class="flex-1">
            <el-input-number v-model="createCampForm.dailyLimit" :min="1" :max="100" style="width: 100%;" />
          </el-form-item>
        </div>

        <el-form-item label="Lead List (CSV or Line-by-Line Paste)">
          <div class="lead-input-hint">
            Format: <code>email, name, company</code> or simply one email per line. You can paste dozens or hundreds of leads below.
          </div>
          <el-input 
            type="textarea" 
            :rows="6" 
            v-model="createCampForm.rawLeadsText" 
            placeholder="alex@techcorp.com, Alex Smith, TechCorp&#10;sarah@fintech.io, Sarah Jones, FinTech Labs&#10;recruiter@stripe.com" 
          />
          <div class="parsed-lead-badge" v-if="parsedLeadsCount > 0">
            ✅ Detected {{ parsedLeadsCount }} valid leads ready to queue
          </div>
        </el-form-item>

        <el-form-item label="Email Subject">
          <el-input v-model="createCampForm.defaultSubject" placeholder="e.g. AI Architecture & Automation — Tasin Sohad" />
        </el-form-item>

        <el-form-item label="Email Pitch Template / Body">
          <el-input 
            type="textarea" 
            :rows="4" 
            v-model="createCampForm.defaultBody" 
            placeholder="Hi [Name], I noticed your team is building... Available immediately for contract or full-time roles." 
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateCampaignModal = false">Cancel</el-button>
        <el-button type="primary" :loading="creatingCampaign" @click="submitCreateCampaign">
          Create Campaign & Queue {{ parsedLeadsCount }} Leads
        </el-button>
      </template>
    </el-dialog>

    <!-- Dialog: Dispatch Batch -->
    <el-dialog v-model="showDispatchModal" title="Dispatch Outreach Batch" width="460px">
      <p style="margin-bottom: 16px; color: #666; font-size: 14px;">
        Immediately dispatches queued leads across your 20 verified inboxes using Resend & Brevo with round-robin rotation.
      </p>
      <el-form label-position="top">
        <el-form-item label="Target Campaign">
          <el-select v-model="dispatchCampaignId" style="width: 100%;">
            <el-option :value="null" label="All Active Campaigns (Round-robin)" />
            <el-option v-for="c in campaigns" :key="c.campaign_id" :value="c.campaign_id" :label="c.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="Number of Emails to Dispatch">
          <el-input-number v-model="dispatchCount" :min="1" :max="20" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="Sending Throttle & Human Delay">
          <el-select v-model="dispatchDelayMode" style="width: 100%;">
            <el-option value="human_natural" label="Natural Human Sending (30s – 60s randomized jitter) [Recommended]" />
            <el-option value="human_cautious" label="Conservative Warmup (60s – 120s randomized jitter)" />
            <el-option value="human_fast" label="Moderate Throttle (15s – 30s randomized jitter)" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="dispatchRespectTimeWindow">
            Enforce Country-wise Business Hours (09:00 AM – 05:00 PM local time)
          </el-checkbox>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
            Prevents delivering late at night or on weekends in each prospect's country.
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDispatchModal = false">Cancel</el-button>
        <el-button type="primary" :loading="dispatching" @click="executeDispatch">Dispatch Now</el-button>
      </template>
    </el-dialog>

    <!-- Dialog: Auto-Pilot Test Simulator -->
    <el-dialog v-model="showAutoPilotModal" title="Autonomous AI Copywriter Simulator" width="620px">
      <div style="font-size: 13.5px; color: #64748b; margin-bottom: 16px; line-height: 1.5;">
        Simulate how Harvey (Client Hunting) or Career-Ops (Job Hunting) analyzes recipient intent, company, and ICP to craft personalized, high-converting cold outreach on the fly.
      </div>
      <el-form label-position="top">
        <div class="form-row">
          <el-form-item label="Target Recipient Email" class="flex-1">
            <el-input v-model="testLead.targetEmail" placeholder="e.g. alex@stripe.com" />
          </el-form-item>
          <el-form-item label="Target Name" class="flex-1">
            <el-input v-model="testLead.targetName" placeholder="e.g. Alex" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="Target Company" class="flex-1">
            <el-input v-model="testLead.company" placeholder="e.g. Stripe" />
          </el-form-item>
          <el-form-item label="Sourcing Engine" class="flex-1">
            <el-select v-model="testLead.campaignType" style="width: 100%;">
              <el-option value="job_hunting" label="🎯 Career-Ops (Job Hunting)" />
              <el-option value="service_outreach" label="🚀 Harvey (B2B Client Acquisition)" />
            </el-select>
          </el-form-item>
        </div>
        <el-button type="primary" :loading="generatingTest" @click="runAutoPilotTest" style="width: 100%; margin-top: 6px;">
          <Icon icon="fluent:sparkle-20-regular" width="18" height="18" style="margin-right: 6px;" />
          Analyze Intent & Generate Personalized Email
        </el-button>
      </el-form>

      <div v-if="testResult" class="sim-result-box" style="margin-top: 18px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
          <el-tag size="small" type="success" effect="dark">
            Drafted by {{ testResult.provider }} ({{ testResult.model }})
          </el-tag>
          <span v-if="testResult.failoverChain && testResult.failoverChain.length > 0" style="font-size: 12px; font-weight: 600; color: #d97706;">
            ⚠️ {{ testResult.failoverChain.length }} Auto-Switch Failover(s) Triggered
          </span>
        </div>

        <!-- Automatic Failover Sequence Notice -->
        <div v-if="testResult.failoverChain && testResult.failoverChain.length > 0" style="margin-bottom: 12px; padding: 10px 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px;">
          <div style="font-size: 12.5px; font-weight: 600; color: #b45309; display: flex; align-items: center; gap: 6px;">
            <Icon icon="fluent:arrow-sync-circle-20-regular" width="16" height="16" />
            <span>Automatic Failover Trail:</span>
          </div>
          <div v-for="(f, fIdx) in testResult.failoverChain" :key="fIdx" style="font-size: 12px; color: #92400e; margin-top: 4px; line-height: 1.4;">
            • <strong>{{ f.provider }}</strong> ({{ f.model }}) failed: <em>{{ f.error }}</em> ➔ Automatically switched to next provider
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Subject Line</div>
          <div style="font-weight: 600; color: #1e293b; font-size: 14.5px; margin-top: 2px;">{{ testResult.subject }}</div>
        </div>
        <div>
          <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Personalized Email Copy</div>
          <div style="white-space: pre-wrap; font-size: 13.5px; color: #334155; line-height: 1.6; margin-top: 4px; padding: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px;">{{ testResult.body }}</div>
        </div>
      </div>
    </el-dialog>

    <!-- Dialog: Auto Mode Cadence & Target Settings -->
    <el-dialog v-model="showAutoModeSettingsModal" title="Full Autonomous Auto Mode Settings" width="540px">
      <div style="font-size: 13.5px; color: #64748b; margin-bottom: 16px; line-height: 1.5;">
        Configure how frequently the autonomous loop checks for fresh opportunities, generates emails, and dispatches them across your 20 inboxes. Deep Search runs twice a day to source the maximum number of opportunities across all verticals.
      </div>
      <el-form label-position="top">
        <el-form-item label="Autonomous Sourcing Cadence">
          <el-select v-model="autoModeConfig.schedule" style="width: 100%;">
            <el-option value="twice_daily" label="Twice a Day (9:00 AM & 6:00 PM Deep Scan) [Recommended]" />
            <el-option value="once_daily" label="Once a Day (Deep Scan)" />
            <el-option value="every_6h" label="Every 6 Hours (Deep Scan)" />
            <el-option value="every_2h" label="Every 2 Hours" />
            <el-option value="every_1h" label="Hourly Drip" />
          </el-select>
        </el-form-item>
        <el-form-item label="Search Depth & Opportunity Yield">
          <el-select v-model="autoModeConfig.searchDepth" style="width: 100%;">
            <el-option value="deep" label="Deep Search (Maximum Yield: 20–50+ opportunities per run across all ICPs)" />
            <el-option value="fast" label="Fast Scan (5–10 opportunities)" />
          </el-select>
        </el-form-item>
        <el-form-item label="Target Opportunities to Scout & Outreach">
          <el-select v-model="autoModeConfig.target" style="width: 100%;">
            <el-option value="both" label="Both: High-Growth Jobs (Career-Ops) + B2B Clients (Harvey)" />
            <el-option value="jobs" label="Career-Ops (Job Hunting Opportunities Only)" />
            <el-option value="clients" label="Harvey (B2B Client Prospects Only)" />
          </el-select>
        </el-form-item>
        <el-form-item label="Drip Batch Size Per Delivery Run">
          <el-select v-model="autoModeConfig.batchSize" style="width: 100%;">
            <el-option :value="3" label="3 Emails per Run (Conservative Warmup)" />
            <el-option :value="6" label="6 Emails per Run (Recommended Balanced Drip)" />
            <el-option :value="10" label="10 Emails per Run (Higher Volume)" />
          </el-select>
        </el-form-item>
        <el-form-item label="Human-like Delay Between Individual Emails (Anti-Blasting)">
          <el-select v-model="autoModeConfig.delayMode" style="width: 100%;">
            <el-option value="human_natural" label="Natural Human Sending (30s – 60s randomized jitter) [Recommended]" />
            <el-option value="human_cautious" label="Conservative Warmup (60s – 120s randomized jitter)" />
            <el-option value="human_fast" label="Moderate Throttle (15s – 30s randomized jitter)" />
          </el-select>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            Applies a randomized delay between every outbound email to simulate real human typing and prevent mail servers from detecting automation bursts.
          </div>
        </el-form-item>
        <el-form-item label="Country-Wise Preferable Business Hours Gate">
          <div style="display: flex; gap: 10px; width: 100%;">
            <el-select v-model="autoModeConfig.windowStartHour" placeholder="Start Hour" style="flex: 1;">
              <el-option :value="8" label="8:00 AM Local Time" />
              <el-option :value="9" label="9:00 AM Local Time [Recommended]" />
              <el-option :value="10" label="10:00 AM Local Time" />
            </el-select>
            <el-select v-model="autoModeConfig.windowEndHour" placeholder="End Hour" style="flex: 1;">
              <el-option :value="17" label="5:00 PM Local Time [Recommended]" />
              <el-option :value="18" label="6:00 PM Local Time" />
              <el-option :value="19" label="7:00 PM Local Time" />
            </el-select>
          </div>
          <div style="margin-top: 8px;">
            <el-checkbox v-model="autoModeConfig.weekdaysOnly">
              Send on Business Days Only (Monday – Friday, skip weekends)
            </el-checkbox>
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            Emails will always start during preferable daytime hours in the recipient's country and timezone. Off-hours leads are safely held until morning.
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAutoModeSettingsModal = false">Cancel</el-button>
        <el-button type="primary" @click="handleSaveAutoModeSettings">Save Settings</el-button>
      </template>
    </el-dialog>

    <!-- Dialog: Inbound Thread & AI Reply Composer -->
    <el-dialog 
      v-model="showThreadModal" 
      title="Conversation Thread & AI Direct Reply" 
      width="780px"
      class="thread-dialog"
      destroy-on-close
    >
      <div v-loading="loadingThread" class="thread-container">
        <div v-if="selectedThread" class="thread-content-flow">
          
          <!-- Prospect Top Header Card -->
          <div class="thread-header-card">
            <div class="thc-info">
              <div class="thc-name">
                {{ selectedThread.matchedLead?.target_name || selectedThread.inbound?.name || selectedThread.inbound?.send_email }}
                <el-tag v-if="selectedThread.matchedLead" size="small" type="success" effect="dark" style="margin-left: 8px;">PROSPECT LEAD</el-tag>
              </div>
              <div class="thc-company" v-if="selectedThread.matchedLead?.company">
                🏢 Company: <strong>{{ selectedThread.matchedLead.company }}</strong>
                <span v-if="selectedThread.matchedLead.campaign_name" style="margin-left: 12px; color: #64748b;">
                  ({{ selectedThread.matchedLead.campaign_name }})
                </span>
              </div>
              <div class="thc-meta-row">
                <span>Sender: <code>{{ selectedThread.inbound?.send_email }}</code></span>
                <span style="margin-left: 16px;">Receiving Mailbox: <code>{{ selectedThread.inbound?.to_email }}</code></span>
              </div>
            </div>
          </div>

          <!-- Original Outbound Pitch Card (if matched lead) -->
          <div v-if="selectedThread.originalOutbound" class="thread-message-card outbound">
            <div class="tmc-header">
              <div class="tmc-title">
                <Icon icon="fluent:send-16-filled" width="16" height="16" style="color: #6366f1;" />
                <span>Original Outbound Pitch by Tasin Sohad</span>
              </div>
              <div class="tmc-time">{{ formatDate(selectedThread.originalOutbound.sentTime) }}</div>
            </div>
            <div class="tmc-subject">Subject: {{ selectedThread.originalOutbound.subject }}</div>
            <div class="tmc-body whitespace-pre">{{ selectedThread.originalOutbound.body }}</div>
          </div>

          <!-- Inbound Prospect Reply Card -->
          <div class="thread-message-card inbound">
            <div class="tmc-header">
              <div class="tmc-title">
                <Icon icon="fluent:mail-arrow-down-16-filled" width="16" height="16" style="color: #10b981;" />
                <span>Inbound Message from {{ selectedThread.inbound?.send_email }}</span>
              </div>
              <div class="tmc-time">{{ formatDate(selectedThread.inbound?.create_time) }}</div>
            </div>
            <div class="tmc-subject">Subject: {{ selectedThread.inbound?.subject }}</div>
            <div class="tmc-body whitespace-pre">{{ selectedThread.inbound?.text || '(no plain text body)' }}</div>
          </div>

          <!-- Direct AI Reply Composer -->
          <div class="ai-reply-composer-box">
            <div class="arc-header">
              <div class="arc-title">
                <Icon icon="fluent:bot-sparkle-20-filled" width="20" height="20" style="color: #6366f1;" />
                <span>Compose Direct Response</span>
              </div>
              <el-button 
                type="primary" 
                size="small" 
                plain 
                :loading="draftingAi" 
                @click="handleDraftAiReply"
              >
                <Icon icon="fluent:sparkle-16-filled" width="14" height="14" style="margin-right: 4px;" />
                ✨ Auto-Draft Response with LLM
              </el-button>
            </div>

            <el-form label-position="top" style="margin-top: 12px;">
              <div class="form-row">
                <el-form-item label="From (Sending Mailbox)" class="flex-1">
                  <el-input :model-value="replyForm.fromEmail" disabled />
                </el-form-item>
                <el-form-item label="To (Recipient)" class="flex-1">
                  <el-input :model-value="replyForm.toEmail" disabled />
                </el-form-item>
              </div>

              <el-form-item label="Reply Subject Line">
                <el-input v-model="replyForm.subject" placeholder="Re: ..." />
              </el-form-item>

              <el-form-item label="Reply Body (Sent as Tasin Sohad)">
                <el-input 
                  v-model="replyForm.text" 
                  type="textarea" 
                  :rows="7" 
                  placeholder="Write your personal response or click Auto-Draft above..." 
                />
              </el-form-item>

              <div class="arc-footer" style="display: flex; justify-content: flex-end; gap: 10px;">
                <el-button @click="showThreadModal = false">Cancel</el-button>
                <el-button 
                  type="success" 
                  :loading="sendingReply" 
                  @click="handleSendReply"
                >
                  <Icon icon="fluent:send-20-filled" width="16" height="16" style="margin-right: 4px;" />
                  Send Reply from {{ replyForm.fromEmail }}
                </el-button>
              </div>
            </el-form>
          </div>

        </div>
      </div>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Icon } from '@iconify/vue';
import { 
  getOutreachDashboard, 
  createCampaign,
  updateCampaignSettings,
  deleteCampaign,
  toggleCampaign, 
  updateCampaign, 
  getOutreachLeads, 
  deleteOutreachLead, 
  dispatchOutreachBatch, 
  updateTelegramSettings, 
  testTelegramSettings,
  fetchLlmModels,
  saveLlmConfig,
  toggleLlmActive,
  reorderLlmChain,
  testLlmProvider,
  updateInboxLimit,
  batchUpdateInboxLimits,
  toggleAutoPilot,
  previewAutoPilot,
  saveSystemPrompts,
  resetSystemPrompts,
  clearAllOutreachLeads,
  toggleAutoScout,
  triggerScoutOpportunities,
  toggleAutoMode,
  runAutoModeCycleNow,
  getDeliverabilityHealth,
  checkEmailSpam,
  sendDeliverabilityTest,
  getMasterInbox,
  getInboxThread,
  sendInboxReply,
  draftAiReply,
  purgeDeadLeads
} from '@/request/outreach.js';

const route = useRoute();
const router = useRouter();

const activeTab = ref(route.query.tab || 'campaigns');

watch(() => route.query.tab, (newTab) => {
  if (newTab) {
    activeTab.value = newTab;
  }
});

watch(activeTab, (newTab) => {
  if (route.query.tab !== newTab) {
    router.replace({ query: { ...route.query, tab: newTab } });
  }
  if (newTab === 'inbox') {
    loadMasterInbox();
  }
});
const loading = ref(false);
const loadingLeads = ref(false);
const dispatching = ref(false);
const savingTg = ref(false);
const testingTg = ref(false);
const creatingCampaign = ref(false);
const savingJobControls = ref(false);
const savingHarveyControls = ref(false);
const fetchingModels = ref(false);
const savingLlm = ref(false);

// Master Inbox Hub State
const unreadInboxCount = ref(0);
const masterInboxList = ref([]);
const masterInboxTotal = ref(0);
const prospectRepliesCount = ref(0);
const loadingMasterInbox = ref(false);
const inboxFilters = reactive({
  page: 1,
  size: 20,
  domain: '',
  search: '',
  intent: 'all'
});

const showThreadModal = ref(false);
const selectedThread = ref(null);
const loadingThread = ref(false);
const replyForm = reactive({
  emailId: null,
  toEmail: '',
  fromEmail: '',
  subject: '',
  text: ''
});
const sendingReply = ref(false);
const draftingAi = ref(false);
const purgingDead = ref(false);

const filteredMasterInboxList = computed(() => {
  if (inboxFilters.intent === 'all') return masterInboxList.value;
  if (inboxFilters.intent === 'prospects') return masterInboxList.value.filter(i => i.isProspect);
  return masterInboxList.value.filter(i => i.intent === inboxFilters.intent);
});

async function loadMasterInbox() {
  loadingMasterInbox.value = true;
  try {
    const res = await getMasterInbox({
      page: inboxFilters.page,
      size: inboxFilters.size,
      domain: inboxFilters.domain || undefined,
      search: inboxFilters.search || undefined
    });
    const d = res?.data || res;
    if (d) {
      masterInboxList.value = d.items || [];
      masterInboxTotal.value = d.total || 0;
      unreadInboxCount.value = d.unread || 0;
      prospectRepliesCount.value = d.prospectReplies || 0;
    }
  } catch (err) {
    ElMessage.error(err.message || 'Failed to fetch master inbox');
  } finally {
    loadingMasterInbox.value = false;
  }
}

let inboxSearchTimeout = null;
function handleInboxSearch() {
  clearTimeout(inboxSearchTimeout);
  inboxSearchTimeout = setTimeout(() => {
    inboxFilters.page = 1;
    loadMasterInbox();
  }, 350);
}

function setIntentFilter(intent) {
  inboxFilters.intent = intent;
}

async function openThread(row) {
  showThreadModal.value = true;
  loadingThread.value = true;
  selectedThread.value = null;
  try {
    const res = await getInboxThread(row.email_id);
    const d = res?.data || res;
    selectedThread.value = d;
    
    // Setup reply form defaults
    replyForm.emailId = row.email_id;
    replyForm.toEmail = row.send_email;
    replyForm.fromEmail = row.to_email;
    replyForm.subject = row.subject?.startsWith('Re:') ? row.subject : `Re: ${row.subject || 'Follow-up'}`;
    replyForm.text = '';

    // Mark as read locally and decrement unread if positive
    row.email_status = 1;
    if (unreadInboxCount.value > 0) unreadInboxCount.value--;
  } catch (err) {
    ElMessage.error(err.message || 'Failed to load thread');
  } finally {
    loadingThread.value = false;
  }
}

async function handleDraftAiReply() {
  if (!selectedThread.value) return;
  draftingAi.value = true;
  try {
    const res = await draftAiReply({
      prospectEmail: replyForm.toEmail,
      prospectMessage: selectedThread.value.inbound?.text || '',
      company: selectedThread.value.matchedLead?.company || '',
      subject: replyForm.subject
    });
    const d = res?.data || res;
    if (d?.reply) {
      replyForm.text = d.reply;
      ElMessage.success('Contextual AI response drafted by LLM!');
    }
  } catch (err) {
    ElMessage.error(err.message || 'Failed to draft AI response');
  } finally {
    draftingAi.value = false;
  }
}

async function handleSendReply() {
  if (!replyForm.text || !replyForm.text.trim()) {
    return ElMessage.warning('Please enter reply text before sending');
  }
  sendingReply.value = true;
  try {
    await sendInboxReply({
      emailId: replyForm.emailId,
      toEmail: replyForm.toEmail,
      subject: replyForm.subject,
      text: replyForm.text
    });
    ElMessage.success(`Reply successfully dispatched from ${replyForm.fromEmail}!`);
    showThreadModal.value = false;
    await loadMasterInbox();
    await fetchData();
  } catch (err) {
    ElMessage.error(err.message || 'Failed to dispatch reply');
  } finally {
    sendingReply.value = false;
  }
}

async function handlePurgeDeadLeads() {
  try {
    await ElMessageBox.confirm(
      'This will perform live MX DNS checks on all queued leads across both campaigns and permanently remove any addresses belonging to dead, inactive, or non-existent domains. Continue?',
      'Purge Dead Leads',
      { confirmButtonText: 'Verify & Purge', cancelButtonText: 'Cancel', type: 'warning' }
    );
  } catch {
    return;
  }

  purgingDead.value = true;
  try {
    const res = await purgeDeadLeads();
    const d = res?.data || res;
    ElMessage.success(d?.message || 'Dead leads purged successfully');
    await fetchData();
    await loadLeads();
  } catch (err) {
    ElMessage.error(err.message || 'Failed to purge dead leads');
  } finally {
    purgingDead.value = false;
  }
}

const autoPilotEnabled = ref(false);
const togglingAutoPilot = ref(false);
const showAutoPilotModal = ref(false);

const autoScoutEnabled = ref(false);
const togglingAutoScout = ref(false);
const scoutingCareer = ref(false);
const scoutingHarvey = ref(false);

const autoModeEnabled = ref(false);
const togglingAutoMode = ref(false);
const runningAutoCycle = ref(false);
const dispatchDelayMode = ref('human_natural');
const dispatchRespectTimeWindow = ref(true);
const autoModeConfig = reactive({
  schedule: 'twice_daily',
  searchDepth: 'deep',
  delayMode: 'human_natural',
  windowStartHour: 9,
  windowEndHour: 17,
  weekdaysOnly: true,
  intervalMinutes: 720,
  target: 'both',
  batchSize: 6
});
const autoModeLastRun = ref(null);
const showAutoModeSettingsModal = ref(false);
const generatingTest = ref(false);
const testLead = reactive({
  targetEmail: 'alex@stripe.com',
  targetName: 'Alex',
  company: 'Stripe',
  campaignType: 'service_outreach'
});
const testResult = ref(null);

async function handleToggleAutoPilot(val) {
  togglingAutoPilot.value = true;
  try {
    const res = await toggleAutoPilot(val);
    autoPilotEnabled.value = res.autopilot ?? val;
    ElMessage.success(res.message || `Auto-Pilot is now ${val ? 'ACTIVATED' : 'PAUSED'}`);
  } catch (err) {
    autoPilotEnabled.value = !val;
    ElMessage.error(err.message || 'Failed to toggle Auto-Pilot');
  } finally {
    togglingAutoPilot.value = false;
  }
}

async function handleToggleAutoScout(val) {
  togglingAutoScout.value = true;
  try {
    await toggleAutoScout(val);
    ElMessage.success(`Autonomous Opportunity Sourcing is now ${val ? 'ACTIVATED' : 'PAUSED'}`);
  } catch (err) {
    autoScoutEnabled.value = !val;
    ElMessage.error(err.message || 'Failed to toggle Auto-Scout');
  } finally {
    togglingAutoScout.value = false;
  }
}

async function handleScoutCareerOps(count = 5) {
  scoutingCareer.value = true;
  try {
    const res = await triggerScoutOpportunities('job_hunting', count);
    const added = res?.data?.added ?? res?.added ?? count;
    ElMessage.success(`Career-Ops Scout discovered & queued ${added} fresh job opportunities!`);
    await Promise.all([fetchData(), loadLeads(), loadDeliverabilityHealth(false)]);
  } catch (err) {
    ElMessage.error(err.message || 'Scouting failed');
  } finally {
    scoutingCareer.value = false;
  }
}

async function handleScoutHarvey(count = 5) {
  scoutingHarvey.value = true;
  try {
    const res = await triggerScoutOpportunities('service_outreach', count);
    const added = res?.data?.added ?? res?.added ?? count;
    ElMessage.success(`Harvey Radar discovered & queued ${added} fresh B2B client prospects!`);
    await Promise.all([fetchData(), loadLeads()]);
  } catch (err) {
    ElMessage.error(err.message || 'Scouting failed');
  } finally {
    scoutingHarvey.value = false;
  }
}

async function handleToggleAutoMode(val) {
  togglingAutoMode.value = true;
  try {
    await toggleAutoMode({ enabled: val, config: autoModeConfig });
    autoModeEnabled.value = val;
    if (val) {
      autoPilotEnabled.value = true;
      autoScoutEnabled.value = true;
    }
    ElMessage.success(`Full Autonomous Auto Mode is now ${val ? 'ACTIVATED' : 'PAUSED'}`);
  } catch (err) {
    autoModeEnabled.value = !val;
    ElMessage.error(err.message || 'Failed to toggle Auto Mode');
  } finally {
    togglingAutoMode.value = false;
  }
}

async function handleSaveAutoModeSettings() {
  try {
    await toggleAutoMode({ enabled: autoModeEnabled.value, config: autoModeConfig });
    ElMessage.success('Auto Mode settings updated successfully');
    showAutoModeSettingsModal.value = false;
  } catch (err) {
    ElMessage.error(err.message || 'Failed to update Auto Mode settings');
  }
}

async function handleRunAutoCycleNow(isDeep = true) {
  runningAutoCycle.value = true;
  try {
    const res = await runAutoModeCycleNow({ 
      target: autoModeConfig.target, 
      batchSize: autoModeConfig.batchSize,
      isDeepSearch: isDeep,
      deepCount: 20
    });
    const report = res?.data || res;
    autoModeLastRun.value = report;
    ElMessage.success(report?.message || 'Deep Search & autonomous cycle completed successfully!');
    await Promise.all([fetchData(), loadLeads()]);
  } catch (err) {
    ElMessage.error(err.message || 'Auto cycle failed');
  } finally {
    runningAutoCycle.value = false;
  }
}

function openAutoPilotTestModal() {
  testResult.value = null;
  showAutoPilotModal.value = true;
}

async function runAutoPilotTest() {
  generatingTest.value = true;
  testResult.value = null;
  try {
    const settings = testLead.campaignType === 'job_hunting' ? jobForm : harveyForm;
    const activePrompt = systemPrompts[testLead.campaignType] || systemPrompts.global;
    const res = await previewAutoPilot({
      targetEmail: testLead.targetEmail,
      targetName: testLead.targetName,
      company: testLead.company,
      campaignType: testLead.campaignType,
      systemPrompt: activePrompt,
      settings
    });
    const payload = res?.data || res;
    if (payload && payload.subject && payload.body) {
      testResult.value = payload;
      ElMessage.success('Email copy generated autonomously!');
    } else {
      ElMessage.warning('No response generated. Please check your active LLM settings.');
    }
  } catch (err) {
    ElMessage.error(err.message || 'Failed to generate preview');
  } finally {
    generatingTest.value = false;
  }
}

const showCreateCampaignModal = ref(false);
const showDispatchModal = ref(false);
const dispatchCampaignId = ref(null);
const dispatchCount = ref(5);

const filterCampaign = ref('');
const filterStatus = ref('all');

const stats = reactive({
  total_leads: 0,
  queued_count: 0,
  sent_count: 0,
  replied_count: 0,
  bounced_count: 0
});

const deliverability = reactive({
  total_sent: 0,
  total_bounced: 0,
  total_delivered: 0,
  total_complained: 0,
  total_replied: 0,
  overall_bounce_rate: 0,
  overall_reply_rate: 0,
  overall_health_score: 100,
  overall_health_status_label: 'Pristine Health',
  overall_spam_risk: 'low'
});

const dnsDomains = ref([
  { domain: 'technetocrat.org', provider: 'Resend', spf: { ok: true }, dkim: { ok: true }, dmarc: { ok: true }, recommendation: null },
  { domain: 'swiftsuretech.com', provider: 'Resend', spf: { ok: true }, dkim: { ok: true }, dmarc: { ok: true }, recommendation: null },
  { domain: 'nccwtech.com', provider: 'Brevo', spf: { ok: true }, dkim: { ok: true }, dmarc: { ok: true }, recommendation: null },
  { domain: 'saiftechnology.com', provider: 'Brevo', spf: { ok: true }, dkim: { ok: true }, dmarc: { ok: true }, recommendation: null }
]);

const scoreboardSearch = ref('');
const loadingHealth = ref(false);

const filteredScoreboardInboxes = computed(() => {
  const list = inboxes.value || [];
  if (!scoreboardSearch.value || !scoreboardSearch.value.trim()) return list;
  const q = scoreboardSearch.value.toLowerCase().trim();
  return list.filter(a => (a.email && a.email.toLowerCase().includes(q)) || (a.name && a.name.toLowerCase().includes(q)));
});

const hasDmarcIssue = computed(() => {
  return dnsDomains.value.some(d => !d.dmarc?.ok);
});

function copyDmarcRecord() {
  const dmarcVal = 'v=DMARC1; p=none; sp=none; aspf=r;';
  navigator.clipboard.writeText(dmarcVal);
  ElMessage.success('Copied DMARC record to clipboard: ' + dmarcVal);
}

async function loadDeliverabilityHealth(isManual = true) {
  loadingHealth.value = true;
  try {
    const res = await getDeliverabilityHealth();
    const d = res?.data || res;
    if (d && Array.isArray(d.domains)) {
      dnsDomains.value = d.domains;
    }
    if (isManual) ElMessage.success('DNS authentication & deliverability audit refreshed!');
  } catch (err) {
    ElMessage.error(err.message || 'Failed to load deliverability health');
  } finally {
    loadingHealth.value = false;
  }
}

const spamScanner = reactive({
  subject: '',
  body: '',
  targetEmail: '',
  analyzing: false,
  result: null
});

function loadSampleForSpamCheck(type) {
  if (type === 'job') {
    spamScanner.subject = 'Autonomous AI & Full-Stack Systems: Tasin Sohad for Engineering';
    spamScanner.body = `Hi Alex,\n\nSaw Stripe is scaling edge compute workflows. At Technetocrat, I engineered autonomous multi-agent pipelines with Cloudflare Workers and sub-100ms latency.\n\nWould you be open to a 2-minute demo of the system architecture this Thursday?\n\nBest,\nTasin Sohad`;
    spamScanner.targetEmail = 'engineering@stripe.com';
  } else {
    spamScanner.subject = 'Quick question regarding technical bottleneck at Stripe';
    spamScanner.body = `Hi Alex,\n\nNoticed Stripe is accelerating distributed data orchestration. We recently resolved similar distributed sync bottlenecks for an enterprise client, slashing query latency by 45%.\n\nWorth a 2-bullet breakdown of how we tackled this?\n\nBest,\nTasin Sohad`;
    spamScanner.targetEmail = 'founders@stripe.com';
  }
  runSpamCheck();
}

async function runSpamCheck() {
  if (!spamScanner.subject && !spamScanner.body) {
    return ElMessage.warning('Please enter an email subject or body to analyze');
  }
  spamScanner.analyzing = true;
  try {
    const res = await checkEmailSpam({ 
      subject: spamScanner.subject, 
      body: spamScanner.body, 
      targetEmail: spamScanner.targetEmail 
    });
    spamScanner.result = res?.data || res;
    ElMessage.success('Pre-flight spam analysis complete!');
  } catch (err) {
    ElMessage.error(err.message || 'Spam trigger scan failed');
  } finally {
    spamScanner.analyzing = false;
  }
}

const testSendForm = reactive({
  fromEmail: '',
  testEmail: '',
  sending: false
});

function openQuickTestModal(senderEmail) {
  testSendForm.fromEmail = senderEmail;
  activeTab.value = 'health';
  ElMessage.info(`Selected ${senderEmail}. Enter your personal destination email below to test.`);
}

async function handleSendDeliverabilityTest(senderEmail) {
  if (senderEmail) {
    testSendForm.fromEmail = senderEmail;
  }
  if (!testSendForm.fromEmail && inboxes.value.length > 0) {
    testSendForm.fromEmail = inboxes.value[0].email;
  }
  if (!testSendForm.testEmail || !testSendForm.testEmail.includes('@')) {
    return ElMessage.warning('Please enter a valid destination email (e.g. your personal Gmail)');
  }
  testSendForm.sending = true;
  try {
    const res = await sendDeliverabilityTest({
      fromEmail: testSendForm.fromEmail,
      testEmail: testSendForm.testEmail
    });
    ElMessage.success(res?.message || 'Diagnostic test email dispatched! Check your inbox.');
  } catch (err) {
    ElMessage.error(err.message || 'Failed to dispatch test email');
  } finally {
    testSendForm.sending = false;
  }
}

const campaigns = ref([]);
const recentReplies = ref([]);
const leadsList = ref([]);
const inboxes = ref([]);
const inboxesDomainFilter = ref('all');
const batchLimitVal = ref(30);
const applyingBatchLimit = ref(false);

const filteredInboxes = computed(() => {
  if (inboxesDomainFilter.value === 'all') {
    return inboxes.value;
  }
  return inboxes.value.filter(a => a.email.endsWith('@' + inboxesDomainFilter.value));
});

async function handleSaveInboxLimit(inbox) {
  inbox.saving = true;
  try {
    const accId = inbox.account_id || inbox.accountId;
    await updateInboxLimit(accId, inbox.tempLimit);
    inbox.daily_send_limit = inbox.tempLimit;
    inbox.remaining = Math.max(0, inbox.tempLimit - (inbox.sent_today || 0));
    ElMessage.success(`Updated limit for ${inbox.email} to ${inbox.tempLimit}/day`);
  } catch (err) {
    ElMessage.error(err.message || 'Failed to update inbox limit');
  } finally {
    inbox.saving = false;
  }
}

async function handleApplyBatchLimit() {
  if (!batchLimitVal.value || batchLimitVal.value < 1) {
    return ElMessage.warning('Please enter a valid daily limit number');
  }
  applyingBatchLimit.value = true;
  try {
    const domain = inboxesDomainFilter.value === 'all' ? null : inboxesDomainFilter.value;
    await batchUpdateInboxLimits(batchLimitVal.value, domain);
    ElMessage.success(`Set daily limit of ${batchLimitVal.value} for ${domain ? domain : 'all'} inboxes!`);
    await fetchData();
  } catch (err) {
    ElMessage.error(err.message || 'Failed to batch update limits');
  } finally {
    applyingBatchLimit.value = false;
  }
}

const telegramForm = reactive({
  tgBotToken: '',
  tgChatId: '',
  configured: false
});

const domainCards = [
  { domain: 'technetocrat.org', provider: 'Resend Account 1', providerType: 'resend', inboxesCount: 5 },
  { domain: 'swiftsuretech.com', provider: 'Resend Account 2', providerType: 'resend', inboxesCount: 5 },
  { domain: 'nccwtech.com', provider: 'Brevo API', providerType: 'brevo', inboxesCount: 5 },
  { domain: 'saiftechnology.com', provider: 'Brevo API', providerType: 'brevo', inboxesCount: 5 }
];

// Job Hunting Controls Form (Career-Ops)
const jobForm = reactive({
  targetRoles: 'Senior Full-Stack Engineer, AI Solution Architect, AI Agent Developer',
  targetRegions: 'US Remote (EST/PST), EU Remote (GMT/CET), Global Remote',
  resumeUrl: 'https://drive.google.com/file/d/1jVtmUEEYGtgmsMp0jGzZQX0QslTVGX4a/view?usp=sharing',
  portfolioUrl: 'github.com/tasinsohad | linkedin.com/in/tasinsohad',
  pitchFocus: "I build software and automations with autonomous AI agents and vibe coding (Claude Code, Antigravity, Cursor) — shipping production systems in days rather than months. Shipped: ITAD CRM (itadcrm.com), sandhan.xyz, 80% operational reduction."
});

// Harvey Client Hunting Controls Form
const harveyForm = reactive({
  icpIndustries: 'B2B SaaS, Software & Technology, Logistics & Supply Chain, Healthcare Tech',
  companySizes: '20-500 employees',
  targetTitles: 'CTO, VP Engineering, Head of AI, Director of Engineering, VP Operations',
  bookingUrl: 'https://drive.google.com/file/d/1jVtmUEEYGtgmsMp0jGzZQX0QslTVGX4a/view?usp=sharing',
  serviceOffering: 'Experienced AI Solution Architect and full-stack builder seeking in-house or dedicated contract roles. Takes AI implementations, LLM workflows, automated pipelines, and internal tools off core engineering backlogs.'
});

// LLM Providers Definition
const llmProviders = ref([
  { id: 'anthropic', name: 'Anthropic Claude', config: null },
  { id: 'nvidia_nim', name: 'NVIDIA NIM', config: null },
  { id: 'google', name: 'Google Gemini', config: null },
  { id: 'openai', name: 'OpenAI', config: null },
  { id: 'openrouter', name: 'OpenRouter', config: null },
  { id: 'custom', name: 'Custom LLM (Ollama/vLLM/Together)', config: null }
]);

const selectedProviderId = ref('anthropic');
const currentLlm = reactive({
  provider: 'anthropic',
  apiKey: '',
  baseUrl: '',
  selectedModel: '',
  modelsList: [],
  isActiveBool: false,
  priority: 1
});

const currentProviderMeta = computed(() => {
  return llmProviders.value.find(p => p.id === selectedProviderId.value);
});

const activeLlmChain = computed(() => {
  return llmProviders.value
    .filter(p => p.config?.is_active && (p.config?.api_key || p.id === 'custom'))
    .sort((a, b) => (a.config?.priority ?? 10) - (b.config?.priority ?? 10));
});

const activeLlmDisplay = computed(() => {
  if (activeLlmChain.value.length === 0) return 'Cloudflare Workers AI (Safety Net)';
  return `${activeLlmChain.value.length} Active in Failover Pool`;
});

// Create Campaign Form
const createCampForm = reactive({
  name: '',
  type: 'service_outreach',
  dailyLimit: 25,
  rawLeadsText: '',
  defaultSubject: 'AI Solution Architecture & Automation — Tasin Sohad',
  defaultBody: `Hi [Name],\n\nI build autonomous AI agents and production web applications with AI-first toolchains.\n\nResume & Portfolio: https://drive.google.com/file/d/1jVtmUEEYGtgmsMp0jGzZQX0QslTVGX4a/view?usp=sharing\n\nBest,\nTasin Sohad`
});

const parsedLeadsCount = computed(() => {
  return parseRawLeads(createCampForm.rawLeadsText).length;
});

function parseRawLeads(rawText = '') {
  if (!rawText.trim()) return [];
  const lines = rawText.split('\n');
  const leads = [];

  for (const line of lines) {
    const clean = line.trim();
    if (!clean) continue;
    // Check if line contains comma-separated values: email, name, company
    if (clean.includes(',')) {
      const parts = clean.split(',').map(s => s.trim());
      const email = parts[0];
      if (email && email.includes('@')) {
        leads.push({
          targetEmail: email,
          targetName: parts[1] || email.split('@')[0],
          company: parts[2] || '',
          subject: createCampForm.defaultSubject,
          body: createCampForm.defaultBody
        });
      }
    } else {
      // Single email per line or "Name <email>"
      const match = clean.match(/<([^>]+)>/);
      const email = match ? match[1].trim() : clean;
      if (email && email.includes('@')) {
        leads.push({
          targetEmail: email,
          targetName: email.split('@')[0],
          company: '',
          subject: createCampForm.defaultSubject,
          body: createCampForm.defaultBody
        });
      }
    }
  }
  return leads;
}

const replyRate = computed(() => {
  if (!stats.sent_count || stats.sent_count === 0) return '0.0';
  return ((stats.replied_count / stats.sent_count) * 100).toFixed(1);
});

async function fetchData() {
  loading.value = true;
  try {
    const raw = await getOutreachDashboard();
    const data = raw?.data || raw;
    if (data) {
      autoPilotEnabled.value = Boolean(data.autopilot);
      autoScoutEnabled.value = Boolean(data.autoscout);
      if (data.automode) {
        autoModeEnabled.value = Boolean(data.automode.enabled);
        Object.assign(autoModeConfig, data.automode.config || {});
        autoModeLastRun.value = data.automode.lastRun;
      }
      if (typeof data.unreadInboxCount === 'number') {
        unreadInboxCount.value = data.unreadInboxCount;
      }
      Object.assign(stats, data.stats || {});
      if (data.deliverability) {
        Object.assign(deliverability, data.deliverability);
      }
      campaigns.value = (data.campaigns || []).map(c => ({
        ...c,
        activeBool: Boolean(c.status)
      }));
      recentReplies.value = data.recentReplies || [];
      inboxes.value = (data.accounts || []).map(a => ({
        ...a,
        tempLimit: a.daily_send_limit ?? 30,
        saving: false
      }));
      if (data.telegram) {
        telegramForm.tgBotToken = data.telegram.tgBotToken;
        telegramForm.tgChatId = data.telegram.tgChatId;
        telegramForm.configured = data.telegram.configured;
      }

      // Populate LLM provider configurations
      if (data.systemPrompts) {
        Object.assign(systemPrompts, data.systemPrompts);
      }

      if (Array.isArray(data.llmConfigs)) {
        data.llmConfigs.forEach(cfg => {
          const prov = llmProviders.value.find(p => p.id === cfg.provider);
          if (prov) {
            prov.config = cfg;
          }
        });
        selectLlmProvider(selectedProviderId.value);
      }
    }
  } catch (err) {
    ElMessage.error(err.message || 'Failed to load outreach metrics');
  } finally {
    loading.value = false;
  }
}

const activePromptMode = ref('service_outreach');
const savingPrompt = ref(false);
const resettingPrompt = ref(false);
const systemPrompts = reactive({
  job_hunting: '',
  service_outreach: '',
  global: ''
});

async function handleSaveSystemPrompts() {
  savingPrompt.value = true;
  try {
    await saveSystemPrompts(systemPrompts);
    ElMessage.success('AI system prompt saved successfully!');
  } catch (err) {
    ElMessage.error(err.message || 'Failed to save system prompt');
  } finally {
    savingPrompt.value = false;
  }
}

async function handleResetSystemPrompts() {
  try {
    await ElMessageBox.confirm(
      'Reset this system prompt to the high-converting default template?',
      'Reset Prompt',
      { confirmButtonText: 'Reset', cancelButtonText: 'Cancel', type: 'warning' }
    );
    resettingPrompt.value = true;
    const res = await resetSystemPrompts(activePromptMode.value);
    const data = res?.data || res;
    if (data && data[activePromptMode.value] !== undefined) {
      systemPrompts[activePromptMode.value] = data[activePromptMode.value];
    }
    ElMessage.success('System prompt reset to default');
  } catch (e) {
    // cancelled or error
  } finally {
    resettingPrompt.value = false;
  }
}

function insertVariable(varName) {
  const current = systemPrompts[activePromptMode.value] || '';
  systemPrompts[activePromptMode.value] = current ? current + ' ' + varName : varName;
  ElMessage.info(`Inserted ${varName}`);
}

const testingConnection = ref(false);
const testConnectionResult = ref(null);

function selectLlmProvider(providerId) {
  selectedProviderId.value = providerId;
  testConnectionResult.value = null;
  const prov = llmProviders.value.find(p => p.id === providerId);
  currentLlm.provider = providerId;
  if (prov && prov.config) {
    currentLlm.apiKey = prov.config.api_key || '';
    currentLlm.baseUrl = prov.config.base_url || '';
    currentLlm.selectedModel = prov.config.selected_model || '';
    currentLlm.isActiveBool = Boolean(prov.config.is_active);
    currentLlm.priority = prov.config.priority ?? 10;
    try {
      currentLlm.modelsList = JSON.parse(prov.config.available_models || '[]');
    } catch (e) {
      currentLlm.modelsList = [];
    }
  } else {
    currentLlm.apiKey = '';
    currentLlm.baseUrl = '';
    currentLlm.selectedModel = '';
    currentLlm.isActiveBool = false;
    currentLlm.priority = 10;
    currentLlm.modelsList = [];
  }
}

async function handleTestConnection() {
  if (!currentLlm.apiKey && currentLlm.provider !== 'custom') {
    return ElMessage.warning(`Please enter or save your ${currentProviderMeta.value?.name} API Key first`);
  }
  testingConnection.value = true;
  testConnectionResult.value = null;
  try {
    const res = await testLlmProvider({
      provider: currentLlm.provider,
      apiKey: currentLlm.apiKey,
      baseUrl: currentLlm.baseUrl,
      selectedModel: currentLlm.selectedModel
    });
    const result = res?.data || res || {};
    testConnectionResult.value = result;
    if (result.success) {
      ElMessage.success(result.message || 'API connection verified successfully!');
    } else {
      ElMessage.error(result.error || 'API connection failed');
    }
  } catch (err) {
    testConnectionResult.value = { success: false, error: err.message };
    ElMessage.error(err.message || 'Connection test failed');
  } finally {
    testingConnection.value = false;
  }
}

async function handleToggleProviderActive(prov, newStatus) {
  try {
    await toggleLlmActive(prov.id, newStatus);
    ElMessage.success(`${prov.name} is now ${newStatus ? 'active in failover pool' : 'disabled'}`);
    await fetchData();
  } catch (err) {
    ElMessage.error(err.message || 'Failed to toggle provider');
  }
}

async function moveProvider(providerId, direction) {
  const chain = [...activeLlmChain.value];
  const idx = chain.findIndex(p => p.id === providerId);
  if (idx < 0) return;
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= chain.length) return;

  const temp = chain[idx];
  chain[idx] = chain[targetIdx];
  chain[targetIdx] = temp;

  try {
    await reorderLlmChain(chain.map(p => p.id));
    ElMessage.success('Failover priority order updated');
    await fetchData();
  } catch (err) {
    ElMessage.error(err.message || 'Failed to update priority order');
  }
}

async function handleFetchModels() {
  if (!currentLlm.apiKey && currentLlm.provider !== 'custom') {
    return ElMessage.warning(`Please enter your ${currentProviderMeta.value?.name} API Key first`);
  }
  fetchingModels.value = true;
  try {
    const res = await fetchLlmModels(currentLlm.provider, currentLlm.apiKey, currentLlm.baseUrl);
    const models = res?.models || res?.data?.models || (Array.isArray(res) ? res : []);
    if (Array.isArray(models) && models.length > 0) {
      currentLlm.modelsList = models;
      if (!currentLlm.selectedModel) {
        currentLlm.selectedModel = models[0].id;
      }
      ElMessage.success(`Discovered ${models.length} models for ${currentProviderMeta.value?.name}`);
    } else {
      ElMessage.warning(`No models returned for ${currentProviderMeta.value?.name}`);
    }
  } catch (err) {
    ElMessage.error(err.message || 'Failed to fetch models from provider');
  } finally {
    fetchingModels.value = false;
  }
}

async function handleSaveLlmConfig() {
  savingLlm.value = true;
  try {
    await saveLlmConfig({
      provider: currentLlm.provider,
      apiKey: currentLlm.apiKey,
      baseUrl: currentLlm.baseUrl,
      selectedModel: currentLlm.selectedModel,
      isActive: currentLlm.isActiveBool ? 1 : 0,
      priority: Number(currentLlm.priority) || 10
    });
    ElMessage.success(`${currentProviderMeta.value?.name} configuration saved successfully!`);
    await fetchData();
  } catch (err) {
    ElMessage.error(err.message || 'Failed to save LLM configuration');
  } finally {
    savingLlm.value = false;
  }
}

function openCreateCampaignDialog() {
  createCampForm.name = '';
  createCampForm.rawLeadsText = '';
  showCreateCampaignModal.value = true;
}

async function submitCreateCampaign() {
  if (!createCampForm.name.trim()) {
    return ElMessage.warning('Please enter a campaign name');
  }
  const leads = parseRawLeads(createCampForm.rawLeadsText);
  creatingCampaign.value = true;
  try {
    const res = await createCampaign({
      name: createCampForm.name.trim(),
      type: createCampForm.type,
      dailyLimit: createCampForm.dailyLimit,
      settings: createCampForm.type === 'job_hunting' ? jobForm : harveyForm,
      leads: leads
    });
    ElMessage.success(res.message || 'Campaign created successfully!');
    showCreateCampaignModal.value = false;
    await fetchData();
    await loadLeads();
  } catch (err) {
    ElMessage.error(err.message || 'Failed to create campaign');
  } finally {
    creatingCampaign.value = false;
  }
}

async function handleDeleteCampaign(campaign) {
  try {
    await ElMessageBox.confirm(`Delete campaign "${campaign.name}" and its queued leads?`, 'Confirm Delete', {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      type: 'warning'
    });
    await deleteCampaign({ campaignId: campaign.campaign_id });
    ElMessage.success('Campaign removed');
    await fetchData();
    await loadLeads();
  } catch (e) {
    // cancelled
  }
}

async function saveJobHuntingControls() {
  savingJobControls.value = true;
  try {
    const jobCamp = campaigns.value.find(c => c.type === 'job_hunting');
    if (jobCamp) {
      await updateCampaignSettings({
        campaignId: jobCamp.campaign_id,
        settings: jobForm
      });
    }
    ElMessage.success('Career-Ops Job Hunting parameters saved!');
  } catch (err) {
    ElMessage.error(err.message || 'Failed to save job controls');
  } finally {
    savingJobControls.value = false;
  }
}

async function saveHarveyControls() {
  savingHarveyControls.value = true;
  try {
    const harveyCamp = campaigns.value.find(c => c.type === 'service_outreach');
    if (harveyCamp) {
      await updateCampaignSettings({
        campaignId: harveyCamp.campaign_id,
        settings: harveyForm
      });
    }
    ElMessage.success('Harvey Client Hunting parameters saved!');
  } catch (err) {
    ElMessage.error(err.message || 'Failed to save Harvey controls');
  } finally {
    savingHarveyControls.value = false;
  }
}

async function loadLeads() {
  loadingLeads.value = true;
  try {
    const res = await getOutreachLeads({
      campaignId: filterCampaign.value || undefined,
      status: filterStatus.value || undefined,
      limit: 100
    });
    const leads = res?.leads || res?.data || (Array.isArray(res) ? res : []);
    leadsList.value = leads;
  } catch (err) {
    ElMessage.error(err.message || 'Failed to load leads list');
  } finally {
    loadingLeads.value = false;
  }
}

async function handleClearAllLeads() {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to delete all leads from the database and reset all dashboard outreach stats to zero?',
      'Reset Outreach Stats',
      {
        confirmButtonText: 'Yes, Reset to 0',
        cancelButtonText: 'Cancel',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    );
    loading.value = true;
    loadingLeads.value = true;
    await clearAllOutreachLeads();
    ElMessage.success('All outreach leads cleared. Stats reset to 0.');
    await Promise.all([fetchData(), loadLeads()]);
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || 'Failed to clear leads');
    }
  } finally {
    loading.value = false;
    loadingLeads.value = false;
  }
}

async function handleCampaignToggle(campaign) {
  try {
    await toggleCampaign(campaign.campaign_id, campaign.activeBool);
    ElMessage.success(`${campaign.name} is now ${campaign.activeBool ? 'Active' : 'Paused'}`);
  } catch (err) {
    campaign.activeBool = !campaign.activeBool;
    ElMessage.error(err.message || 'Failed to toggle campaign');
  }
}

async function handleDailyLimitChange(campaign) {
  try {
    await updateCampaign(campaign.campaign_id, campaign.daily_limit);
    ElMessage.success(`Updated daily limit for ${campaign.name} to ${campaign.daily_limit}`);
  } catch (err) {
    ElMessage.error(err.message || 'Failed to update limit');
  }
}

function openDispatchDialog() {
  showDispatchModal.value = true;
}

async function executeDispatch() {
  dispatching.value = true;
  try {
    const res = await dispatchOutreachBatch(dispatchCampaignId.value, dispatchCount.value, dispatchDelayMode.value, dispatchRespectTimeWindow.value);
    ElMessage.success(res.message || 'Dispatch completed');
    showDispatchModal.value = false;
    await fetchData();
    await loadLeads();
  } catch (err) {
    ElMessage.error(err.message || 'Dispatch failed');
  } finally {
    dispatching.value = false;
  }
}

async function handleDeleteLead(lead) {
  try {
    await ElMessageBox.confirm(`Delete lead ${lead.target_email}?`, 'Confirm Delete', {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      type: 'warning'
    });
    await deleteOutreachLead(lead.lead_id);
    ElMessage.success('Lead removed');
    await fetchData();
    await loadLeads();
  } catch (e) {
    // cancelled
  }
}

async function handleSaveTelegram() {
  savingTg.value = true;
  try {
    await updateTelegramSettings(telegramForm.tgBotToken, telegramForm.tgChatId);
    telegramForm.configured = Boolean(telegramForm.tgBotToken && telegramForm.tgChatId);
    ElMessage.success('Telegram alert settings saved successfully!');
  } catch (err) {
    ElMessage.error(err.message || 'Failed to save Telegram settings');
  } finally {
    savingTg.value = false;
  }
}

async function handleTestTelegram() {
  if (!telegramForm.tgBotToken || !telegramForm.tgChatId) {
    return ElMessage.warning('Please enter both Bot Token and Chat ID to send a test alert');
  }
  testingTg.value = true;
  try {
    await testTelegramSettings(telegramForm.tgBotToken, telegramForm.tgChatId);
    ElMessage.success('Test notification sent to Telegram!');
  } catch (err) {
    ElMessage.error(err.message || 'Failed to send Telegram test message');
  } finally {
    testingTg.value = false;
  }
}

function jumpToReply(reply) {
  if (reply.reply_email_id) {
    router.push({ path: '/inbox', query: { emailId: reply.reply_email_id, reply: '1' } });
  } else {
    router.push({ path: '/inbox' });
  }
}

function getStatusTag(status) {
  switch (status) {
    case 'queued': return 'info';
    case 'sent': return 'primary';
    case 'replied': return 'success';
    case 'bounced': return 'danger';
    default: return 'info';
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString();
}

onMounted(async () => {
  await Promise.all([fetchData(), loadLeads()]);
  if (activeTab.value === 'inbox') {
    loadMasterInbox();
  }
});
</script>

<style scoped>
.automode-master-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 18px 22px;
  margin-bottom: 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
  transition: all 0.25s ease;
}

.automode-master-card.is-automode-active {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border-color: #86efac;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.12);
}

.automode-main-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.automode-left {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  max-width: 780px;
}

.automode-pulse-icon {
  width: 52px;
  height: 52px;
  min-width: 52px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
}

.is-automode-active .automode-pulse-icon {
  background: #dcfce7;
  color: #059669;
}

.automode-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.automode-title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}

.automode-desc {
  font-size: 13px;
  color: #475569;
  line-height: 1.45;
}

.automode-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.auto-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: #047857;
  background: #d1fae5;
  padding: 3px 8px;
  border-radius: 6px;
}

.automode-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.automode-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}

.outreach-page {
  height: 100%;
  background: #f7f9fc;
  box-sizing: border-box;
}

.outreach-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1f36;
  margin: 0 0 6px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #697386;
  margin: 0;
}

.header-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.autopilot-banner {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px 22px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
  transition: all 0.25s ease;
}

.autopilot-banner.autopilot-active {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border-color: #86efac;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.12);
}

.autopilot-left {
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 750px;
}

.autopilot-icon-box {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.25s ease;
}

.autopilot-active .autopilot-icon-box {
  background: #dcfce7;
  color: #059669;
}

.autopilot-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.autopilot-heading {
  font-size: 16.5px;
  font-weight: 700;
  color: #0f172a;
}

.autopilot-desc {
  font-size: 13.5px;
  color: #475569;
  line-height: 1.45;
}

.autopilot-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e3e8ee;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.stat-icon-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-wrapper.blue { background: #e8f3ff; color: #1677ff; }
.stat-icon-wrapper.orange { background: #fff2e8; color: #fa8c16; }
.stat-icon-wrapper.green { background: #f6ffed; color: #52c41a; }
.stat-icon-wrapper.purple { background: #f9f0ff; color: #722ed1; }

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #1a1f36;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #697386;
  margin-top: 4px;
}

:deep(.outreach-tabs > .el-tabs__header) {
  display: none !important;
}

.tabs-quick-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 18px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.tab-nav-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: #ffffff;
  color: #475569;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.tab-nav-pill:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

.tab-nav-pill.active {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
  font-weight: 600;
}

.tab-nav-pill.highlight-ai {
  border-color: #e9d5ff;
}

.tab-nav-pill.highlight-ai:hover {
  background: #faf5ff;
  border-color: #d8b4fe;
}

.tab-nav-pill.highlight-ai.active {
  background: #7e22ce;
  border-color: #7e22ce;
  box-shadow: 0 2px 6px rgba(126, 34, 206, 0.28);
}

.tab-nav-pill.highlight-tg {
  border-color: #bae6fd;
}

.tab-nav-pill.highlight-tg:hover {
  background: #f0f9ff;
  border-color: #7dd3fc;
}

.tab-nav-pill.highlight-tg.active {
  background: #0284c7;
  border-color: #0284c7;
  box-shadow: 0 2px 6px rgba(2, 132, 199, 0.28);
}

.outreach-tabs {
  margin-top: 10px;
}

:deep(.el-tabs__header) {
  margin-bottom: 20px;
}

:deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 500;
}

.section-card {
  background: #fff;
  border-radius: 12px;
  padding: 22px;
  border: 1px solid #e3e8ee;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1f36;
}

.section-help-text {
  font-size: 13.5px;
  color: #697386;
  margin-top: -8px;
  margin-bottom: 18px;
  line-height: 1.5;
}

.form-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.flex-1 {
  flex: 1;
  min-width: 260px;
}

.domains-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.inbox-batch-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.batch-label {
  font-size: 13px;
  color: #697386;
  font-weight: 500;
}

.inbox-filter-bar {
  margin-bottom: 16px;
  overflow-x: auto;
}

.inboxes-table {
  border-radius: 8px;
  overflow: hidden;
}

.inbox-cell {
  display: flex;
  flex-direction: column;
}

.inbox-email {
  font-weight: 600;
  font-size: 13.5px;
  color: #1a1f36;
}

.inbox-name {
  font-size: 12px;
  color: #8792a2;
}

.quota-usage {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quota-numbers {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  color: #4f566b;
}

.quota-rem {
  font-size: 11.5px;
  color: #059669;
  font-weight: 500;
}

.quota-exhausted {
  color: #dc2626;
  font-weight: 600;
}

.limit-input-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.domain-card {
  background: #fbfcfe;
  border: 1px solid #e6ebf1;
  border-radius: 8px;
  padding: 14px 16px;
}

.domain-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.domain-name {
  font-weight: 600;
  font-size: 14px;
  color: #20242c;
}

.domain-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: #555;
  margin-bottom: 10px;
}

.status-indicator {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #52c41a;
}

.domain-footer {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-tag {
  font-size: 11px;
  color: #8792a2;
}

.campaigns-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 16px;
}

.campaign-box {
  background: #fbfcfe;
  border: 1px solid #e6ebf1;
  border-radius: 10px;
  padding: 18px;
}

.campaign-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}

.campaign-title {
  font-weight: 600;
  font-size: 15px;
  color: #1a1f36;
  margin-bottom: 4px;
}

.campaign-desc {
  font-size: 12.5px;
  color: #697386;
}

.campaign-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px dashed #e3e8ee;
  flex-wrap: wrap;
  gap: 8px;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  color: #4f566b;
}

.campaign-actions {
  display: flex;
  gap: 6px;
}

/* LLM Provider Styles */
/* AI System Prompt Card */
.system-prompt-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px 20px;
  margin-top: 18px;
  margin-bottom: 20px;
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 12px;
}

.prompt-title-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 720px;
}

.prompt-icon-box {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.prompt-heading {
  font-size: 15.5px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.prompt-subheading {
  font-size: 13px;
  color: #64748b;
  line-height: 1.45;
  margin-top: 3px;
}

.prompt-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prompt-mode-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.mode-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 7px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-pill:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

.mode-pill.active {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(79, 70, 229, 0.25);
}

.prompt-editor-wrapper {
  margin-bottom: 10px;
}

.system-prompt-textarea :deep(.el-textarea__inner) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.55;
  background: #ffffff;
  border-radius: 8px;
}

.variables-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 6px;
}

.variables-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.variables-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.var-badge {
  font-family: monospace;
  font-size: 11.5px;
  color: #4f46e5;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 5px;
  padding: 2px 7px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.var-badge:hover {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
}

/* Failover Pool Visualizer */
.failover-pool-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px 20px;
  margin-bottom: 20px;
}

.failover-pool-header {
  margin-bottom: 16px;
}

.failover-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.failover-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.failover-subtitle {
  font-size: 13px;
  color: #64748b;
  line-height: 1.45;
  display: block;
}

.failover-pipeline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.pipeline-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pipeline-node-content {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 12px;
  min-width: 140px;
  position: relative;
  transition: all 0.2s ease;
}

.pipeline-node-content:hover {
  border-color: #94a3b8;
  background: #e2e8f0;
}

.pipeline-node-content.safety-net {
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.pipeline-rank-badge {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  color: #2563eb;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.pipeline-rank-badge.safety {
  color: #059669;
}

.pipeline-node-name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.pipeline-node-model {
  font-size: 11.5px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 130px;
}

.pipeline-status-text {
  font-size: 11px;
  color: #10b981;
  margin-top: 2px;
  font-weight: 500;
}

.pipeline-node-actions {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.node-arrow-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  cursor: pointer;
  color: #475569;
  transition: all 0.15s ease;
}

.node-arrow-btn:hover:not(:disabled) {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

.node-arrow-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pipeline-connector {
  color: #94a3b8;
  display: flex;
  align-items: center;
}

.provider-card-toggle {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
  display: flex;
  justify-content: flex-end;
}

.test-conn-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  margin-top: 14px;
  font-size: 13px;
}

.test-conn-banner.is-success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.test-conn-banner.is-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.test-conn-title {
  font-weight: 600;
  margin-bottom: 2px;
}

.test-conn-msg {
  font-size: 12.5px;
  line-height: 1.4;
  word-break: break-all;
}

.provider-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.provider-select-card {
  background: #fbfcfe;
  border: 1px solid #e6ebf1;
  border-radius: 8px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.provider-select-card:hover {
  border-color: #722ed1;
  background: #faf7ff;
}

.provider-select-card.is-active-tab {
  border-color: #722ed1;
  box-shadow: 0 0 0 2px rgba(114, 46, 209, 0.15);
  background: #ffffff;
}

.provider-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.provider-card-name {
  font-size: 13.5px;
  font-weight: 600;
  color: #1a1f36;
}

.provider-card-model {
  font-size: 12px;
  color: #697386;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-config-box {
  background: #fafbfd;
  border: 1px solid #e3e8ee;
  border-radius: 10px;
  padding: 20px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.config-header h3 {
  margin: 0;
  font-size: 16px;
  color: #1a1f36;
}

.model-selection-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.fetch-btn-col {
  margin-bottom: 18px;
}

.save-llm-row {
  display: flex;
  justify-content: flex-end;
}

/* Replies & Telegram */
.two-column-row {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: #8792a2;
  text-align: center;
  font-size: 13px;
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reply-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-radius: 8px;
  background: #fbfcfe;
  border: 1px solid #e6ebf1;
}

.reply-main {
  flex: 1;
  min-width: 0;
}

.reply-lead {
  font-size: 13.5px;
  color: #1a1f36;
  margin-bottom: 2px;
}

.reply-company {
  font-size: 12.5px;
  color: #697386;
  margin-left: 6px;
}

.reply-subject {
  font-size: 13px;
  color: #4f566b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 340px;
  margin-bottom: 4px;
}

.reply-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reply-time {
  font-size: 11.5px;
  color: #8792a2;
}

.tg-description {
  font-size: 13px;
  color: #4f566b;
  line-height: 1.5;
  margin-bottom: 16px;
}

.tg-form {
  margin-top: 10px;
}

.tg-btn-row {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.table-filters {
  display: flex;
  gap: 12px;
}

.lead-input-hint {
  font-size: 12px;
  color: #8792a2;
  margin-bottom: 6px;
}

.lead-input-hint code {
  background: #f0f2f5;
  padding: 2px 4px;
  border-radius: 4px;
  color: #1677ff;
}

.parsed-lead-badge {
  margin-top: 6px;
  font-size: 12.5px;
  color: #52c41a;
  font-weight: 500;
}

/* Responsive Mobile & Tablet Enhancements */
:deep(.el-dialog) {
  width: 92% !important;
  max-width: 680px !important;
  margin: 16px auto !important;
  border-radius: 14px !important;
  box-sizing: border-box;
}

:deep(.el-dialog__header) {
  padding: 16px 18px 12px !important;
  margin-right: 0 !important;
}

:deep(.el-dialog__title) {
  font-size: 16px !important;
  font-weight: 700 !important;
  word-break: break-word;
}

:deep(.el-dialog__body) {
  padding: 14px 18px !important;
  max-height: 75vh;
  overflow-y: auto;
  box-sizing: border-box;
}

:deep(.el-dialog__footer) {
  padding: 12px 18px 16px !important;
}

/* Tablet & Mobile Breakpoint (<= 992px) */
@media (max-width: 992px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .two-column-row {
    flex-direction: column;
    gap: 16px;
  }

  .provider-selector-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Standard Mobile Breakpoint (<= 768px) */
@media (max-width: 768px) {
  .outreach-page {
    overflow-x: hidden;
  }

  .outreach-container {
    padding: 12px 10px 24px;
    width: 100%;
    box-sizing: border-box;
  }

  /* Page Header */
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .page-title {
    font-size: 20px;
    line-height: 1.25;
  }

  .page-subtitle {
    font-size: 13px;
    line-height: 1.4;
  }

  /* 2x2 Header Action Grid on Mobile */
  .header-buttons {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .header-buttons .el-button {
    width: 100%;
    margin-left: 0 !important;
    justify-content: center;
    padding: 9px 8px;
    font-size: 12.5px;
    height: auto;
  }

  /* Full Auto Mode Card Mobile */
  .automode-main-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .automode-left {
    flex-direction: row;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
  }

  .automode-pulse-icon {
    width: 42px;
    height: 42px;
    min-width: 42px;
    border-radius: 10px;
  }

  .automode-right {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    border-top: 1px dashed #cbd5e1;
    padding-top: 12px;
    margin-top: 4px;
    gap: 10px;
  }

  .automode-btns {
    width: 100%;
    display: flex;
    gap: 8px;
  }

  .automode-btns .el-button {
    flex: 1;
    justify-content: center;
    margin-left: 0 !important;
  }

  /* Autonomous Auto-Pilot Banner */
  .autopilot-banner {
    flex-direction: column;
    align-items: stretch;
    padding: 14px;
    gap: 12px;
    margin-bottom: 16px;
  }

  .autopilot-left {
    flex-direction: row;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    max-width: 100%;
  }

  .autopilot-icon-box {
    width: 42px;
    height: 42px;
    min-width: 42px;
    border-radius: 10px;
  }

  .autopilot-heading {
    font-size: 15px;
  }

  .autopilot-desc {
    font-size: 12.5px;
    line-height: 1.4;
  }

  .autopilot-right {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px dashed #e2e8f0;
    padding-top: 10px;
    margin-top: 2px;
    gap: 10px;
  }

  /* Stat Cards */
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 16px;
  }

  .stat-card {
    padding: 12px 10px;
    gap: 10px;
  }

  .stat-icon-wrapper {
    width: 42px;
    height: 42px;
    min-width: 42px;
    border-radius: 10px;
  }

  .stat-icon-wrapper svg {
    width: 22px;
    height: 22px;
  }

  .stat-value {
    font-size: 20px;
  }

  .stat-label {
    font-size: 11.5px;
    margin-top: 2px;
  }

  /* Horizontal Scrollable Quick Nav Pills */
  .tabs-quick-nav {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 6px 8px;
    gap: 8px;
    margin-bottom: 14px;
    border-radius: 10px;
  }

  .tabs-quick-nav::-webkit-scrollbar {
    display: none;
  }

  .tab-nav-pill {
    flex-shrink: 0;
    padding: 7px 12px;
    font-size: 12.5px;
    white-space: nowrap;
  }

  /* Element Plus Tabs Header */
  :deep(.el-tabs__header) {
    overflow-x: auto;
    margin-bottom: 14px;
  }

  :deep(.el-tabs__nav-wrap) {
    overflow-x: auto !important;
  }

  :deep(.el-tabs__item) {
    font-size: 13.5px !important;
    padding: 0 10px !important;
    white-space: nowrap;
  }

  /* Card Containers */
  .section-card {
    padding: 14px 12px;
    margin-bottom: 16px;
    overflow-x: hidden;
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    margin-bottom: 14px;
  }

  .section-header .section-title {
    width: 100%;
    font-size: 15px;
  }

  .section-header .el-button {
    width: 100%;
    margin-left: 0 !important;
  }

  .section-help-text {
    font-size: 12.5px;
    margin-bottom: 14px;
  }

  /* Grids */
  .campaigns-grid,
  .domains-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .campaign-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .campaign-actions {
    display: flex;
    justify-content: flex-end;
  }

  /* Inboxes Batch & Domain Filtering */
  .inbox-batch-controls {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .inbox-batch-controls .batch-label {
    font-size: 12.5px;
  }

  .inbox-batch-controls .el-input-number {
    width: 90px !important;
  }

  .inbox-batch-controls .el-button {
    flex: 1;
    min-width: 140px;
    margin-left: 0 !important;
  }

  .inbox-filter-bar {
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 6px;
    margin-bottom: 12px;
  }

  .inbox-filter-bar::-webkit-scrollbar {
    display: none;
  }

  .inbox-filter-bar :deep(.el-radio-group) {
    display: inline-flex;
    flex-wrap: nowrap;
  }

  .inbox-filter-bar :deep(.el-radio-button__inner) {
    padding: 6px 10px;
    font-size: 12px;
    white-space: nowrap;
  }

  /* Tables Mobile Safety */
  :deep(.el-table) {
    width: 100% !important;
  }

  :deep(.el-table__inner-wrapper) {
    overflow-x: auto !important;
  }

  :deep(.el-table__header-wrapper),
  :deep(.el-table__body-wrapper) {
    overflow-x: auto !important;
  }

  .inbox-cell {
    min-width: 160px;
  }

  .inbox-email {
    font-size: 13px;
    word-break: break-all;
  }

  /* Failover Pool Waterfall Flow */
  .failover-pool-card {
    padding: 14px 12px;
  }

  .failover-pipeline {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 10px;
  }

  .pipeline-node {
    width: 100%;
    flex-direction: column;
  }

  .pipeline-node-content {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .pipeline-connector {
    transform: rotate(90deg);
    margin: 2px auto;
  }

  /* AI System Prompt Card */
  .system-prompt-card {
    padding: 14px 12px;
  }

  .prompt-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .prompt-title-row {
    flex-direction: row;
    gap: 10px;
  }

  .prompt-heading {
    font-size: 15px;
  }

  .prompt-subheading {
    font-size: 12px;
  }

  .prompt-actions {
    display: flex;
    gap: 8px;
    width: 100%;
  }

  .prompt-actions .el-button {
    flex: 1;
    justify-content: center;
    margin-left: 0 !important;
    font-size: 12px;
    padding: 8px 6px;
  }

  .prompt-mode-tabs {
    display: flex;
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 6px;
    gap: 8px;
  }

  .prompt-mode-tabs::-webkit-scrollbar {
    display: none;
  }

  .mode-pill {
    flex-shrink: 0;
    font-size: 12px;
    padding: 6px 10px;
    white-space: nowrap;
  }

  .variables-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .variables-label {
    font-size: 11.5px;
  }

  .variables-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .var-badge {
    font-size: 11px;
    padding: 3px 7px;
  }

  /* Provider Selector Cards */
  .provider-selector-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .provider-select-card {
    padding: 10px;
  }

  .provider-card-name {
    font-size: 12.5px;
  }

  /* Active Provider Config Box */
  .provider-config-box {
    padding: 14px 12px;
  }

  .config-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .config-header .el-switch {
    width: 100%;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .model-selection-row {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .fetch-btn-col {
    margin-bottom: 0;
  }

  .fetch-btn-col .el-button {
    width: 100%;
  }

  .save-llm-row {
    flex-direction: column;
    gap: 8px !important;
    width: 100%;
  }

  .save-llm-row .el-button {
    width: 100%;
    margin-left: 0 !important;
  }

  /* Leads Queue Table Filters */
  .table-filters {
    flex-direction: column;
    width: 100%;
    margin-top: 10px;
    gap: 8px;
  }

  .table-filters .el-select,
  .table-filters .el-button {
    width: 100% !important;
    margin-left: 0 !important;
  }

  /* Telegram Alerts Section */
  .tg-btn-row {
    flex-direction: column;
    gap: 8px;
  }

  .tg-btn-row .el-button {
    width: 100%;
    margin-left: 0 !important;
  }

  .reply-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .reply-item .el-button {
    align-self: stretch;
    justify-content: center;
  }

  /* Dialog Footers on Mobile */
  :deep(.el-dialog__footer) {
    display: flex;
    flex-direction: column-reverse;
    gap: 8px;
  }

  :deep(.el-dialog__footer .el-button) {
    width: 100%;
    margin-left: 0 !important;
  }
}

/* Small Screens (<= 480px) */
@media (max-width: 480px) {
  .header-buttons {
    grid-template-columns: 1fr;
  }

  .provider-selector-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}

/* Deliverability & Spam Health Suite Styles */
.stats-grid-6 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-icon-wrapper.red {
  background: #fef2f2;
  color: #ef4444;
}

.stat-icon-wrapper.teal {
  background: #f0fdfa;
  color: #0d9488;
}

.card-bounce-warn {
  border: 1px solid #fde68a !important;
  background: #fffbeb !important;
}

.card-bounce-crit {
  border: 1px solid #fecaca !important;
  background: #fef2f2 !important;
}

.tab-nav-pill.highlight-health {
  background: #f0fdf4;
  border-color: #86efac;
  color: #15803d;
}

.tab-nav-pill.highlight-health:hover,
.tab-nav-pill.highlight-health.active {
  background: #16a34a !important;
  border-color: #16a34a !important;
  color: #ffffff !important;
}

.bounce-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.sub-bounce-count {
  font-size: 11px;
  color: #64748b;
}

.deliverability-suite {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 30px;
}

.health-overview-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.health-overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 18px;
  border-bottom: 1px solid #f1f5f9;
}

.health-overview-title-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.health-shield-icon {
  width: 52px;
  height: 52px;
  min-width: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.health-shield-icon.shield-good {
  background: #dcfce7;
  color: #15803d;
}

.health-shield-icon.shield-warn {
  background: #fef3c7;
  color: #b45309;
}

.health-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.health-subtitle {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}

.health-kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
}

.health-kpi-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
}

.hk-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hk-value {
  font-size: 28px;
  font-weight: 800;
  margin: 6px 0 4px 0;
}

.hk-sub {
  font-size: 16px;
  font-weight: 500;
  color: #94a3b8;
}

.hk-desc {
  font-size: 12px;
  color: #64748b;
}

.dmarc-warning-banner {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-left: 5px solid #f59e0b;
  border-radius: 10px;
  padding: 18px 20px;
  display: flex;
  gap: 16px;
}

.dw-icon {
  color: #d97706;
}

.dw-title {
  font-size: 15px;
  font-weight: 700;
  color: #92400e;
  margin-bottom: 4px;
}

.dw-text {
  font-size: 13px;
  color: #78350f;
  line-height: 1.5;
  margin-bottom: 12px;
}

.dw-action-box {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  background: #ffffff;
  border: 1px solid #fde68a;
  padding: 8px 14px;
  border-radius: 8px;
}

.dw-dns-code {
  font-family: monospace;
  font-size: 12px;
  color: #1e293b;
}

.dw-key {
  color: #64748b;
  font-weight: 600;
}

.health-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 22px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.health-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-icon {
  width: 24px;
  height: 24px;
}

.section-icon.blue { color: #2563eb; }
.section-icon.indigo { color: #4f46e5; }
.section-icon.amber { color: #d97706; }
.section-icon.purple { color: #7c3aed; }
.section-icon.green { color: #16a34a; }

.section-h3 {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.section-sub {
  font-size: 12px;
  color: #64748b;
  margin: 2px 0 0 0;
}

.domain-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.domain-dns-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  transition: all 0.2s ease;
}

.domain-dns-card.dom-warning {
  border-color: #fde68a;
  background: #fffdf5;
}

.dom-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.dom-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.dom-records {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
}

.record-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rec-label {
  color: #64748b;
  font-weight: 500;
}

.dom-rec-notice {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #fde68a;
  font-size: 11px;
  color: #b45309;
  display: flex;
  align-items: flex-start;
  gap: 5px;
  line-height: 1.4;
}

.guide-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.guide-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 18px;
  display: flex;
  flex-direction: column;
}

.guide-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.guide-number {
  background: #e0e7ff;
  color: #4338ca;
  font-size: 12px;
  font-weight: 800;
  padding: 3px 7px;
  border-radius: 6px;
}

.guide-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.guide-body {
  font-size: 12px;
  color: #475569;
  line-height: 1.5;
  flex: 1;
}

.guide-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.safe { background: #10b981; }
.status-indicator.warn { background: #f59e0b; }

.health-dual-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 20px;
}

.scanner-presets {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.preset-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.scanner-results-card {
  margin-top: 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
}

.scan-score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.scan-score-val {
  font-size: 24px;
  font-weight: 800;
}

.score-sub {
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
}

.triggers-detected-box {
  margin-bottom: 12px;
}

.trigger-box-title {
  font-size: 12px;
  font-weight: 600;
  color: #dc2626;
  margin-bottom: 6px;
}

.trigger-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.scan-suggestions-box {
  font-size: 12px;
  color: #334155;
}

.sugg-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.sugg-list {
  margin: 0;
  padding-left: 18px;
  line-height: 1.6;
}

.test-send-instructions {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 16px;
}

.ins-title {
  font-size: 12px;
  font-weight: 700;
  color: #166534;
  margin-bottom: 6px;
}

.ins-steps {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #15803d;
  line-height: 1.6;
}

.score-bar-wrapper {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.score-val {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
}

/* Master Inbox & Folder Placement Styles */
.highlight-inbox {
  background: linear-gradient(135deg, #eef2ff 0%, #ede9fe 100%) !important;
  border-color: #c7d2fe !important;
  color: #4f46e5 !important;
  font-weight: 600;
}

.highlight-inbox:hover,
.highlight-inbox.active {
  background: #6366f1 !important;
  border-color: #6366f1 !important;
  color: #ffffff !important;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3) !important;
}

.inbox-pill-badge {
  background: #ef4444;
  color: white;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  margin-left: 6px;
}

.inbox-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.inbox-metrics-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 14px;
  margin-bottom: 16px;
}

.inbox-kpi-pill {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 140px;
}

.ik-label {
  font-size: 11.5px;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.ik-value {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.ik-value.unread {
  color: #ef4444;
}

.ik-value.prospect {
  color: #059669;
}

.inbox-filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  background: #ffffff;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin-bottom: 14px;
}

.intent-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.intent-chip {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 5px 12px;
  font-size: 12.5px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.intent-chip:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.intent-chip.active {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
  font-weight: 600;
}

.inbound-sender-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inbound-sender-name {
  font-size: 14px;
  color: #0f172a;
  display: flex;
  align-items: center;
}

.inbound-sender-email {
  font-size: 12.5px;
  color: #64748b;
}

.inbound-company-tag {
  font-size: 11.5px;
  color: #3b82f6;
  font-weight: 600;
  margin-top: 2px;
}

.inbound-subject-cell {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.inbound-subject-cell:hover .inbound-subject-text {
  color: #2563eb;
  text-decoration: underline;
}

.inbound-subject-text {
  font-size: 13.5px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.inbound-subject-text.is-unread {
  font-weight: 700;
  color: #0f172a;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2563eb;
  display: inline-block;
  flex-shrink: 0;
}

.inbound-snippet {
  font-size: 12.5px;
  color: #64748b;
  line-height: 1.4;
}

.inbound-camp-name {
  font-size: 11px;
  color: #94a3b8;
}

.receiving-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.receiving-email {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}

.inbox-time {
  font-size: 12px;
  color: #64748b;
}

/* Thread Modal */
.thread-container {
  min-height: 300px;
}

.thread-content-flow {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.thread-header-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 18px;
}

.thc-name {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
}

.thc-company {
  font-size: 13.5px;
  color: #334155;
  margin-top: 4px;
}

.thc-meta-row {
  font-size: 12px;
  color: #64748b;
  margin-top: 6px;
}

.thread-message-card {
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #e2e8f0;
}

.thread-message-card.outbound {
  background: #fdfdfe;
  border-left: 4px solid #6366f1;
}

.thread-message-card.inbound {
  background: #f0fdf4;
  border-left: 4px solid #10b981;
}

.tmc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tmc-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 700;
  color: #1e293b;
}

.tmc-time {
  font-size: 11.5px;
  color: #94a3b8;
}

.tmc-subject {
  font-size: 13.5px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 8px;
}

.tmc-body {
  font-size: 13.5px;
  line-height: 1.6;
  color: #334155;
}

.whitespace-pre {
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-reply-composer-box {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.arc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px dashed #e2e8f0;
}

.arc-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14.5px;
  font-weight: 700;
  color: #0f172a;
}

/* Folder Placement and MX Status Styles */
.folder-prediction-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 10px;
  margin-top: 14px;
}

.fpc-primary {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
}

.fpc-promotions {
  background: #fefce8;
  border: 1px solid #fef08a;
  color: #854d0e;
}

.fpc-spam {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.fpc-title {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
  opacity: 0.85;
}

.fpc-status {
  font-size: 14.5px;
  margin-top: 2px;
}

.fpc-sub {
  font-size: 12.5px;
  opacity: 0.9;
}

.mx-check-status-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  margin-top: 10px;
}

.mx-check-status-box.mx-pass {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.mx-check-status-box.mx-fail {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

</style>
