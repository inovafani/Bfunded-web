/**
 * BFunded waitlist -> Google Sheet + email notification.
 *
 * Does two jobs on every submission:
 *   1. appends a row to the "Submissions" sheet (the full history)
 *   2. emails NOTIFY_EMAIL so nobody has to watch the sheet
 *
 * SETUP
 *   1. Create a Google Sheet (this is where submissions land).
 *   2. Extensions -> Apps Script. Delete the placeholder, paste this file, Save.
 *   3. Deploy -> New deployment -> type "Web app".
 *        Execute as:          Me
 *        Who has access:      Anyone            <-- required, the browser posts here
 *   4. Authorise when prompted (it needs Sheets + Gmail permission).
 *   5. Copy the /exec URL and set it in Netlify:
 *        Site configuration -> Environment variables
 *        NEXT_PUBLIC_SHEETS_ENDPOINT = https://script.google.com/macros/s/.../exec
 *   6. Redeploy the site so the value is baked in.
 *
 * After editing this script you must Deploy -> Manage deployments -> Edit ->
 * Version: New version, or the live URL keeps running the old code.
 */

const SHEET_NAME = 'Submissions';
const NOTIFY_EMAIL = 'ac@bfunded.io';
const HEADERS = ['Timestamp', 'Name', 'Email', 'Role', 'Company', 'Website', 'Source'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Concurrent submissions would otherwise race and overwrite the same row.
    lock.waitLock(20000);

    const p = (e && e.parameter) || {};
    const row = [
      new Date(),
      p.name || '',
      p.email || '',
      p.role || '',
      p.company || '',
      p.website || '',
      p.source || '',
    ];

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.appendRow(row);

    notify_(p);
    return json_({ ok: true });
  } catch (err) {
    // Never surface a 500 to the browser: the site treats this as fire-and-forget
    // and Netlify Forms already holds a copy.
    console.error(err);
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

function notify_(p) {
  if (!NOTIFY_EMAIL) return;
  const who = p.name || 'Someone';
  const role = p.role || 'unspecified';
  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: 'BFunded waitlist: ' + who + ' (' + role + ')',
      body: [
        'New founding-cohort submission.',
        '',
        'Name:    ' + (p.name || '-'),
        'Email:   ' + (p.email || '-'),
        'Role:    ' + (p.role || '-'),
        'Company: ' + (p.company || '-'),
        'Website: ' + (p.website || '-'),
        'Page:    ' + (p.source || '-'),
        '',
        'Full history: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
      ].join('\n'),
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

/** Run once from the editor to check the sheet + email wiring. */
function testSubmission() {
  doPost({
    parameter: {
      name: 'Test Founder',
      email: 'test@example.com',
      role: 'Founder',
      company: 'Test Co',
      website: 'https://example.com',
      source: '/',
    },
  });
}
