require('dotenv').config();
const jsforce = require('jsforce');
const fs = require('fs');
const path = require('path');

const HTML_FILE = path.join(__dirname, 'index.html');
const START_MARKER = '// ──── SALESFORCE DATA START (auto-updated by sync) ────';
const END_MARKER = '// ──── SALESFORCE DATA END ────';

const VERTICAL_LEADS = { v1: 'Crawford Smith', v2: 'Laura Michael' };
const LEAD_ROLES = { 'Crawford Smith': 'Senior Vice President — Portfolio Lead', 'Laura Michael': 'Vice President — Portfolio Lead' };

const MEMBERS_META = {
  "Finn Boettcher": { role: "Account Team Member", note: "Supporting all Vertical 1 accounts" },
  "Alex Stout": { role: "Leadership Consultant" },
  "Sydney Myong": { role: "Senior Associate", partner: "Shreya Mahatwo" },
  "Claire Pearce": { role: "Leadership Consultant" },
  "Lauren Bomgardner": { role: "Sr. Leadership Consultant", partner: "Shreya Mahatwo", split: true },
  "Jenna King": { role: "Sr. Leadership Consultant" },
  "Nchopia Nwokoma": { role: "Director, Leadership Consulting" },
  "Helen Jennings": { role: "Sr. Director — EMEA Operations" }
};

const NP_KEYWORDS = ['foundation','united way','care international','unicef','boys & girls',
  'big brothers','literacy','ymca','mentor','salzburg','symphony','smithsonian','braven',
  'clare matrix','groundwork','missionwired','i.c. stars','meds & food','institute for global'];

const PHOTOS = {
  "Crawford Smith": "https://excoleadership.s3.us-west-2.amazonaws.com/americas/wp-content/uploads/2026/04/16112333/Crawford-Smith.png",
  "Laura Michael": "https://excoleadership.s3.us-west-2.amazonaws.com/americas/wp-content/uploads/2026/04/16112624/Laura-Michael-1.png",
  "Alex Stout": "https://excoleadership.s3.us-west-2.amazonaws.com/americas/wp-content/uploads/2026/04/16112303/Alex-Stout.png",
  "Sydney Myong": "https://excoleadership.s3.us-west-2.amazonaws.com/americas/wp-content/uploads/2026/04/16112919/Sydney-Myong.png",
  "Shreya Mahatwo": "https://excoleadership.s3.us-west-2.amazonaws.com/americas/wp-content/uploads/2026/04/16112905/Shreya-Mahatwo.png",
  "Claire Pearce": "https://excoleadership.s3.us-west-2.amazonaws.com/americas/wp-content/uploads/2026/04/16113642/Claire-Pearce.png",
  "Lauren Bomgardner": "https://excoleadership.s3.us-west-2.amazonaws.com/americas/wp-content/uploads/2026/04/16112633/Lauren-Bomgardner-275x300.png",
  "Jenna King": "https://excoleadership.s3.us-west-2.amazonaws.com/americas/wp-content/uploads/2026/04/16112504/Jenna-King.png",
  "Nchopia Nwokoma": "https://excoleadership.s3.us-west-2.amazonaws.com/americas/wp-content/uploads/2026/04/29100408/Nchopia-Nwokoma-2.png",
  "Helen Jennings": "https://excoleadership.s3.us-west-2.amazonaws.com/americas/wp-content/uploads/2026/04/16113826/Helen-Jennings-275x300.png"
};

function getDomain(website) {
  if (!website) return '';
  try { return new URL(website.startsWith('http') ? website : 'https://' + website).hostname.replace('www.', ''); }
  catch { return ''; }
}
function isNonprofit(name) { return NP_KEYWORDS.some(kw => name.toLowerCase().includes(kw)); }

async function main() {
  console.log('[SYNC] Connecting to Salesforce...');
  const conn = new jsforce.Connection({ loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com' });
  await conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD);
  console.log('[SYNC] Connected.');

  const output = {};
  for (const [vkey, leadName] of Object.entries(VERTICAL_LEADS)) {
    const res = await conn.query(`
      SELECT Name, Website, Current_Customer__c, Account_Manager__r.Name, Account_Coordinator__r.Name
      FROM Account WHERE Type = 'Current Customer' AND Vertical_Lead__r.Name = '${leadName}'
      ORDER BY Account_Manager__r.Name, Name LIMIT 500`);
    console.log(`[SYNC] ${vkey} (${leadName}): ${res.totalSize} accounts`);

    const byManager = {};
    for (const rec of res.records) {
      const mgr = rec.Account_Manager__r?.Name || 'Unassigned';
      if (!byManager[mgr]) byManager[mgr] = [];
      byManager[mgr].push({ n: rec.Name, d: getDomain(rec.Website), cb: rec.Current_Customer__c === true });
    }

    const members = [];
    for (const [mgrName, accounts] of Object.entries(byManager)) {
      const meta = MEMBERS_META[mgrName] || { role: "Account Team Member" };
      const member = { name: mgrName, role: meta.role, accounts: [] };
      if (meta.partner) member.partner = meta.partner;
      if (meta.note) member.note = meta.note;
      if (meta.split) {
        member.split = true;
        member.accounts = accounts.filter(a => !isNonprofit(a.n)).map(a => ({ n: a.n, d: a.d, cb: a.cb }));
        member.nonprofits = accounts.filter(a => isNonprofit(a.n)).map(a => ({ n: a.n, d: a.d, cb: a.cb }));
      } else { member.accounts = accounts.map(a => ({ n: a.n, d: a.d, cb: a.cb })); }
      members.push(member);
    }
    output[vkey] = { lead: leadName, leadRole: LEAD_ROLES[leadName] || 'Portfolio Lead', members };
  }

  // Build the new data block
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const dataBlock = `// AUTO-GENERATED — Last synced: ${timestamp}\nconst PH=${JSON.stringify(PHOTOS)};\nconst MEMBERS_META=${JSON.stringify(MEMBERS_META)};\nconst DATA=${JSON.stringify(output,null,2)};\n`;

  // Read HTML file and replace the data section
  let html = fs.readFileSync(HTML_FILE, 'utf-8');
  const startIdx = html.indexOf(START_MARKER);
  const endIdx = html.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) { console.error('[SYNC] ❌ Could not find data markers in index.html'); process.exit(1); }

  html = html.slice(0, startIdx + START_MARKER.length + 1) + dataBlock + html.slice(endIdx);
  fs.writeFileSync(HTML_FILE, html);
  console.log(`[SYNC] ✅ index.html updated (${html.length} bytes)`);
  await conn.logout();
}

main().catch(err => { console.error('[SYNC] ❌', err.message); process.exit(1); });
