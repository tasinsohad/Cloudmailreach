/**
 * sync-sourcing-engines.mjs
 * Syncs outreach leads from Career-Ops and Harvey directly into Cloud Mail Outreach Hub.
 */

import fs from 'fs';
import path from 'path';

const CLOUD_MAIL_URL = process.env.CLOUD_MAIL_URL || 'https://cloud-mail.sohad-flowtics.workers.dev';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'tasin@technetocrat.org';
const ADMIN_PASS = process.env.ADMIN_PASS || '';

async function login() {
  const res = await fetch(`${CLOUD_MAIL_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS })
  });
  const data = await res.json();
  if (data.code !== 200 || !data.data?.token) {
    throw new Error(`Login failed: ${data.message || JSON.stringify(data)}`);
  }
  return data.data.token;
}

async function syncCareerOps(token) {
  const queuePath = 'D:\\AI agents\\career-ops\\data\\outreach-queue.json';
  if (!fs.existsSync(queuePath)) {
    console.log(`[Career-Ops] Queue not found at ${queuePath}`);
    return;
  }
  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  const pending = queue.filter(item => item.status !== 'sent');
  if (pending.length === 0) {
    console.log('[Career-Ops] No pending leads in queue.');
    return;
  }

  const payload = pending.map(item => ({
    campaignId: 1,
    targetEmail: item.recipient,
    targetName: item.recipient.split('@')[0],
    company: item.company || '',
    source: 'career_ops',
    subject: item.subject,
    body: item.body
  }));

  const res = await fetch(`${CLOUD_MAIL_URL}/api/outreach/lead/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    },
    body: JSON.stringify(payload)
  });
  const result = await res.json();
  console.log(`[Career-Ops] Synced ${payload.length} leads:`, result.message);
}

async function main() {
  console.log('Authenticating with Cloud Mail...');
  const token = await login();
  console.log('Syncing Career-Ops leads to Cloud Mail buffer...');
  await syncCareerOps(token);
  console.log('Done.');
}

main().catch(err => console.error('Sync error:', err.message));
