/**
 * sync-sourcing-engines.mjs
 * Syncs outreach leads from Career-Ops and Harvey directly into Cloud Mail Outreach Hub.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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
  const pending = queue.filter(item => item.recipient && item.recipient.includes('@'));
  if (pending.length === 0) {
    console.log('[Career-Ops] No pending leads in queue.');
    return;
  }

  const payload = pending.map(item => ({
    campaignId: 1,
    targetEmail: item.recipient.trim(),
    targetName: item.target_name || item.recipient.split('@')[0],
    company: item.company || '',
    source: 'career_ops',
    subject: item.subject || '',
    body: item.body || ''
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

async function syncHarvey(token) {
  const dbPath = 'D:\\personal projects\\harvey\\data\\harvey.db';
  if (!fs.existsSync(dbPath)) {
    console.log(`[Harvey] Database not found at ${dbPath}`);
    return;
  }

  // Extract prospects using python
  const pyCmd = `python -c "import sqlite3, json; con = sqlite3.connect(r'${dbPath}'); rows = con.execute('SELECT first_name, last_name, email, company, title FROM prospects WHERE email IS NOT NULL AND email != \\'\\' AND email LIKE \\'%@%\\';').fetchall(); print(json.dumps([{'first_name': r[0], 'last_name': r[1], 'email': r[2], 'company': r[3], 'title': r[4]} for r in rows]))"`;
  let prospects = [];
  try {
    const stdout = execSync(pyCmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    prospects = JSON.parse(stdout.trim());
  } catch (err) {
    console.error('[Harvey] Failed to extract from SQLite db:', err.message);
    return;
  }

  if (prospects.length === 0) {
    console.log('[Harvey] No prospects found.');
    return;
  }

  const payload = prospects.map(p => ({
    campaignId: 2,
    targetEmail: p.email.trim(),
    targetName: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email.split('@')[0],
    company: p.company || '',
    source: 'harvey',
    subject: '',
    body: ''
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
  console.log(`[Harvey] Synced ${payload.length} prospects into Campaign #2:`, result.message);
}

async function main() {
  console.log('Authenticating with Cloud Mail...');
  const token = await login();
  console.log('Syncing Career-Ops leads to Cloud Mail buffer...');
  await syncCareerOps(token);
  console.log('Syncing Harvey B2B prospects to Cloud Mail buffer...');
  await syncHarvey(token);
  console.log('All local sourcing engines synced successfully!');
}

main().catch(err => console.error('Sync error:', err.message));
