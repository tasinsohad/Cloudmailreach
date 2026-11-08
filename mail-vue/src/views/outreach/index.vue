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

        <!-- Metric Stat Cards -->
        <div class="stats-grid">
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
        </div>

        <!-- Main Tabbed Control Navigation -->
        <el-tabs v-model="activeTab" class="outreach-tabs">
          
          <!-- TAB 1: Campaigns & Sending Infrastructure -->
          <el-tab-pane label="Campaigns & Inboxes" name="campaigns">
            
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

          <!-- TAB 2: Job Hunting Controls (Career-Ops) -->
          <el-tab-pane label="Job Hunting Controls" name="job_hunting">
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
          <el-tab-pane label="Harvey Client Controls" name="client_hunting">
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
          <el-tab-pane label="Harvey LLM Engine" name="llm_engine">
            <div class="section-card">
              <div class="section-header">
                <div class="section-title">
                  <Icon icon="fluent:brain-circuit-20-regular" width="22" height="22" style="color: #722ed1;" />
                  <span>Harvey Multi-Provider LLM Brain Configuration</span>
                </div>
                <el-tag :type="activeLlmInfo ? 'success' : 'info'" size="large">
                  Active LLM: {{ activeLlmDisplay }}
                </el-tag>
              </div>

              <p class="section-help-text">
                Connect your API keys across Anthropic, NVIDIA NIM, Google Gemini, OpenAI, OpenRouter, or Custom LLMs. Adding an API key lets you choose discovered models from an interactive dropdown menu.
              </p>

              <!-- Provider Picker Buttons -->
              <div class="provider-selector-grid">
                <div 
                  v-for="p in llmProviders" 
                  :key="p.id" 
                  class="provider-select-card"
                  :class="{ 'is-active-tab': selectedProviderId === p.id, 'is-active-engine': p.config?.is_active }"
                  @click="selectLlmProvider(p.id)"
                >
                  <div class="provider-card-top">
                    <span class="provider-card-name">{{ p.name }}</span>
                    <el-tag v-if="p.config?.is_active" size="small" type="success" effect="dark">Active Engine</el-tag>
                  </div>
                  <div class="provider-card-model">
                    {{ p.config?.selected_model || 'No model chosen' }}
                  </div>
                </div>
              </div>

              <!-- Active Provider Configuration Form -->
              <div class="provider-config-box" v-if="currentLlm">
                <div class="config-header">
                  <h3>Configure {{ currentProviderMeta?.name }}</h3>
                  <el-switch 
                    v-model="currentLlm.isActiveBool" 
                    active-text="Set as Active Harvey LLM" 
                  />
                </div>

                <el-form label-position="top">
                  <el-form-item :label="currentProviderMeta?.name + ' API Key'" required>
                    <el-input 
                      v-model="currentLlm.apiKey" 
                      placeholder="Paste your API key here..." 
                      show-password 
                    />
                  </el-form-item>

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

                  <div class="save-llm-row">
                    <el-button 
                      type="primary" 
                      :loading="savingLlm" 
                      @click="handleSaveLlmConfig"
                    >
                      Save {{ currentProviderMeta?.name }} Configuration
                    </el-button>
                  </div>
                </el-form>
              </div>

            </div>
          </el-tab-pane>

          <!-- TAB 5: Inbound Replies & Telegram Alerts -->
          <el-tab-pane label="Replies & Telegram Alerts" name="replies">
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
                  When a lead replies to any of your 20 inboxes, Cloud Mail forwards the full context to your Telegram bot with a <strong>1-Click Reply</strong> button.
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
      </el-form>
      <template #footer>
        <el-button @click="showDispatchModal = false">Cancel</el-button>
        <el-button type="primary" :loading="dispatching" @click="executeDispatch">Dispatch Now</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
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
  saveLlmConfig
} from '@/request/outreach.js';

const router = useRouter();

const activeTab = ref('campaigns');
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

const campaigns = ref([]);
const recentReplies = ref([]);
const leadsList = ref([]);

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
  isActiveBool: false
});

const currentProviderMeta = computed(() => {
  return llmProviders.value.find(p => p.id === selectedProviderId.value);
});

const activeLlmInfo = computed(() => {
  const active = llmProviders.value.find(p => p.config?.is_active);
  return active ? active.config : null;
});

const activeLlmDisplay = computed(() => {
  if (!activeLlmInfo.value) return 'None (Configure Below)';
  const prov = llmProviders.value.find(p => p.id === activeLlmInfo.value.provider);
  return `${prov?.name || activeLlmInfo.value.provider} — ${activeLlmInfo.value.selected_model || 'Default'}`;
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
  if (!stats.sent_count) return 0;
  return ((stats.replied_count / stats.sent_count) * 100).toFixed(1);
});

async function fetchData() {
  loading.value = true;
  try {
    const res = await getOutreachDashboard();
    if (res.code === 200 && res.data) {
      Object.assign(stats, res.data.stats);
      campaigns.value = (res.data.campaigns || []).map(c => ({
        ...c,
        activeBool: Boolean(c.status)
      }));
      recentReplies.value = res.data.recentReplies || [];
      if (res.data.telegram) {
        telegramForm.tgBotToken = res.data.telegram.tgBotToken;
        telegramForm.tgChatId = res.data.telegram.tgChatId;
        telegramForm.configured = res.data.telegram.configured;
      }

      // Populate LLM provider configurations
      if (Array.isArray(res.data.llmConfigs)) {
        res.data.llmConfigs.forEach(cfg => {
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

function selectLlmProvider(providerId) {
  selectedProviderId.value = providerId;
  const prov = llmProviders.value.find(p => p.id === providerId);
  currentLlm.provider = providerId;
  if (prov && prov.config) {
    currentLlm.apiKey = prov.config.api_key || '';
    currentLlm.baseUrl = prov.config.base_url || '';
    currentLlm.selectedModel = prov.config.selected_model || '';
    currentLlm.isActiveBool = Boolean(prov.config.is_active);
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
    currentLlm.modelsList = [];
  }
}

async function handleFetchModels() {
  if (!currentLlm.apiKey && currentLlm.provider !== 'custom') {
    return ElMessage.warning(`Please enter your ${currentProviderMeta.value?.name} API Key first`);
  }
  fetchingModels.value = true;
  try {
    const res = await fetchLlmModels(currentLlm.provider, currentLlm.apiKey, currentLlm.baseUrl);
    if (res.code === 200 && Array.isArray(res.models)) {
      currentLlm.modelsList = res.models;
      if (res.models.length > 0 && !currentLlm.selectedModel) {
        currentLlm.selectedModel = res.models[0].id;
      }
      ElMessage.success(`Discovered ${res.models.length} models for ${currentProviderMeta.value?.name}`);
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
      isActive: currentLlm.isActiveBool ? 1 : 0
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
    if (res.code === 200) {
      leadsList.value = res.data || [];
    }
  } catch (err) {
    ElMessage.error(err.message || 'Failed to load leads list');
  } finally {
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
    const res = await dispatchOutreachBatch(dispatchCampaignId.value, dispatchCount.value);
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
});
</script>

<style scoped>
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

/* Responsive Mobile Enhancements */
:deep(.el-dialog) {
  max-width: 95vw !important;
  margin: 20px auto !important;
}

@media (max-width: 768px) {
  .outreach-container {
    padding: 12px 10px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .page-title {
    font-size: 20px;
  }

  .header-buttons {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .header-buttons .el-button {
    width: 100%;
    margin-left: 0 !important;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .stat-card {
    padding: 14px;
  }

  .campaigns-grid {
    grid-template-columns: 1fr;
  }

  .domains-grid {
    grid-template-columns: 1fr;
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

  .save-llm-row .el-button {
    width: 100%;
  }

  .table-filters {
    flex-direction: column;
    width: 100%;
    margin-top: 10px;
  }

  .table-filters .el-select {
    width: 100% !important;
  }

  .tg-btn-row {
    flex-direction: column;
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
    align-self: flex-end;
  }
}
</style>
