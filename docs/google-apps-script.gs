/**
 * BFunded waitlist -> Google Sheet + email notification.
 *
 * On every submission it:
 *   1. appends a row to the "Submissions" sheet (created automatically)
 *   2. emails NOTIFY_EMAIL so nobody has to watch the sheet
 *
 * ----------------------------------------------------------------------------
 * PASTE THIS AT THE TOP LEVEL OF Code.gs.
 *
 * Do NOT wrap it in `function myFunction() { ... }`. Apps Script exposes a web
 * app only through a GLOBAL `doPost`; nested inside another function it is
 * invisible and Google answers "Script function not found: doPost".
 * Delete the default `myFunction` stub completely.
 * ----------------------------------------------------------------------------
 *
 * SETUP
 *   1. Open your Google Sheet -> Extensions -> Apps Script.
 *      (That binds the script to the Sheet. If you instead created a standalone
 *      project at script.google.com, fill in SPREADSHEET_ID below.)
 *   2. Delete everything in Code.gs, paste this file, Save.
 *   3. Deploy -> Manage deployments -> pencil -> Version: NEW VERSION -> Deploy.
 *        Execute as:      Me
 *        Who has access:  Anyone      <-- not "Anyone with Google Account"
 *   4. Authorise when prompted (needs Sheets + Gmail permission).
 *
 * VERIFY: open the /exec URL in a browser. Expected:
 *   {"ok":true,"service":"bfunded-waitlist","sheet":"..."}
 *   "Script function not found"  -> code still wrapped, or old version deployed
 *   "Akses Ditolak" / login page -> access is not set to "Anyone"
 *
 * The site posts these fields (see app/_content/home.html):
 *   role, name, email, company, url, firm, focus, source
 * `role` is Founder or Investor and decides which half is filled in:
 *   Founder  -> company, url
 *   Investor -> firm, focus
 */

/** Leave '' when the script is bound to the Sheet. Otherwise paste the Sheet ID
 *  (from its URL: /spreadsheets/d/<THIS PART>/edit). */
const SPREADSHEET_ID = '';

const SHEET_NAME = 'Submissions';
const NOTIFY_EMAIL = 'ac@bfunded.io';
const HEADERS = [
  'Timestamp', 'Role', 'Name', 'Email',
  'Company', 'Website / URL',   // Founder
  'Firm', 'What They Invest In', // Investor
  'Source',
];

/** Health check: confirms access and wiring by just opening the URL. */
function doGet() {
  try {
    return json_({ ok: true, service: 'bfunded-waitlist', sheet: book_().getName() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Concurrent submissions would otherwise race and overwrite the same row.
    lock.waitLock(20000);

    const p = (e && e.parameter) || {};
    sheet_().appendRow([
      new Date(),
      p.role || '',
      p.name || '',
      p.email || '',
      p.company || '',
      p.url || p.website || '', // `website` was the old form's name for this
      p.firm || '',
      p.focus || '',
      p.source || '',
    ]);

    notify_(p);
    return json_({ ok: true });
  } catch (err) {
    // Never surface a 500: the site sends this fire-and-forget and Netlify Forms
    // holds a copy. Check View -> Executions in the editor for details.
    console.error(err);
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

/** The spreadsheet, whether the script is bound to it or standalone. */
function book_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('No spreadsheet. Script is not bound to a Sheet -- set SPREADSHEET_ID.');
  }
  return active;
}

/** The Submissions sheet, with headers written on first use. */
function sheet_() {
  const ss = book_();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) writeHeaders_(sheet);
  return sheet;
}

function notify_(p) {
  if (!NOTIFY_EMAIL) return;
  const isFounder = (p.role || '') !== 'Investor';
  const lines = [
    'New ' + (p.role || 'unspecified') + ' submission.',
    '',
    'Name:    ' + (p.name || '-'),
    'Email:   ' + (p.email || '-'),
  ];
  // Only show the half the form actually collected for this role.
  if (isFounder) {
    lines.push('Company: ' + (p.company || '-'));
    lines.push('Website: ' + (p.url || p.website || '-'));
  } else {
    lines.push('Firm:    ' + (p.firm || '-'));
    lines.push('Invests: ' + (p.focus || '-'));
  }
  lines.push('Page:    ' + (p.source || '-'));
  lines.push('');
  lines.push('Full history: ' + book_().getUrl());

  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: 'BFunded ' + (p.role || 'signup') + ': ' + (p.name || 'Someone'),
      body: lines.join('\n'),
    });
  } catch (err) {
    // A hit Gmail quota must not cost us the row that was already written.
    console.error('notify failed: ' + err);
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/** Run from the editor to test the sheet + email wiring, both roles. */
function testSubmission() {
  console.log(doPost({ parameter: {
    role: 'Founder', name: 'Test Founder', email: 'founder@example.com',
    company: 'Test Co', url: 'https://example.com', source: '/',
  }}).getContent());

  console.log(doPost({ parameter: {
    role: 'Investor', name: 'Test Investor', email: 'investor@example.com',
    firm: 'Test Capital', focus: 'Pre-seed, climate, $50-250k', source: '/',
  }}).getContent());
}

/**
 * ONE-OFF REPAIR. Run this once from the editor after upgrading the script.
 *
 * The sheet may hold rows in two different column orders:
 *   old (7 cols): Timestamp, Name,  Email, Role,  Company, Website, Source
 *   new (9 cols): Timestamp, Role,  Name,  Email, Company, URL, Firm, Focus, Source
 * and a header row that still describes the old one.
 *
 * Each row is classified by which column actually holds Founder/Investor, so a
 * sheet with a mix of both is migrated correctly. Rows are rebuilt in memory
 * first and only written once, so a failure cannot leave the sheet half-done.
 */
function repairSheet() {
  const sheet = book_().getSheetByName(SHEET_NAME);
  if (!sheet) {
    console.log('No "' + SHEET_NAME + '" sheet yet -- nothing to repair.');
    return;
  }
  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), HEADERS.length);
  if (lastRow < 2) {
    writeHeaders_(sheet);
    console.log('No data rows. Headers written.');
    return;
  }

  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const isRole = function (v) { return v === 'Founder' || v === 'Investor'; };

  let fixedOld = 0, keptNew = 0, skipped = 0;
  const rebuilt = [];
  data.forEach(function (r) {
    const blank = r.every(function (c) { return c === '' || c === null; });
    if (blank) return;

    if (isRole(r[1])) {          // already the new order
      keptNew++;
      rebuilt.push([r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8]]);
    } else if (isRole(r[3])) {   // old order -> remap
      fixedOld++;
      rebuilt.push([r[0], r[3], r[1], r[2], r[4], r[5], '', '', r[6]]);
    } else {                     // unrecognised: keep as-is, do not guess
      skipped++;
      rebuilt.push([r[0], r[1], r[2], r[3], r[4], r[5], r[6] || '', r[7] || '', r[8] || '']);
    }
  });

  sheet.clear();
  writeHeaders_(sheet);
  if (rebuilt.length) {
    sheet.getRange(2, 1, rebuilt.length, HEADERS.length).setValues(rebuilt);
  }
  console.log(
    'Repaired. old-format rows remapped: ' + fixedOld +
    ', already-new rows kept: ' + keptNew +
    ', unrecognised left alone: ' + skipped
  );
}

function writeHeaders_(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 150);
}
