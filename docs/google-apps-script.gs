/**
 * BFunded waitlist -> Google Sheet + email notification.
 *
 * Does two jobs on every submission:
 *   1. appends a row to the "Submissions" sheet (created automatically)
 *   2. emails NOTIFY_EMAIL so nobody has to watch the sheet
 *
 * ----------------------------------------------------------------------------
 * IMPORTANT: paste this at the TOP LEVEL of Code.gs.
 *
 * Do NOT wrap it in `function myFunction() { ... }`. Apps Script only exposes a
 * web app through a GLOBAL `doPost`; nested inside another function it is
 * invisible and every request fails with a Google error page instead.
 * Delete the default `myFunction` stub entirely.
 * ----------------------------------------------------------------------------
 *
 * SETUP
 *   1. Open your Google Sheet -> Extensions -> Apps Script.
 *      (Creating the script this way binds it to the Sheet. If you instead made
 *      a standalone project at script.google.com, fill in SPREADSHEET_ID below.)
 *   2. Delete everything in Code.gs, paste this file, Save.
 *   3. Deploy -> New deployment -> type "Web app".
 *        Execute as:      Me
 *        Who has access:  Anyone      <-- NOT "Anyone with Google Account"
 *   4. Authorise when prompted (needs Sheets + Gmail permission).
 *   5. Copy the /exec URL into Netlify:
 *        Site configuration -> Environment variables
 *        NEXT_PUBLIC_SHEETS_ENDPOINT = https://script.google.com/macros/s/.../exec
 *   6. Redeploy the site so the value is baked into the build.
 *
 * VERIFY: open the /exec URL in a browser. You should see
 *   {"ok":true,"service":"bfunded-waitlist","sheet":"..."}
 * Anything else (a login page, "Akses Ditolak") means access is not "Anyone",
 * or the deployment is still serving an older version.
 *
 * AFTER ANY EDIT: Deploy -> Manage deployments -> pencil -> Version: New
 * version -> Deploy. Saving alone leaves the live URL on the old code.
 */

/** Leave '' when the script is bound to the Sheet. Otherwise paste the Sheet ID
 *  (the long id in its URL: /spreadsheets/d/<THIS PART>/edit). */
const SPREADSHEET_ID = '';

const SHEET_NAME = 'Submissions';
const NOTIFY_EMAIL = 'ac@bfunded.io';
const HEADERS = ['Timestamp', 'Name', 'Email', 'Role', 'Company', 'Website', 'Source'];

/** Health check: lets you confirm access by just opening the URL. */
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
    const sheet = sheet_();
    sheet.appendRow([
      new Date(),
      p.name || '',
      p.email || '',
      p.role || '',
      p.company || '',
      p.website || '',
      p.source || '',
    ]);

    notify_(p);
    return json_({ ok: true });
  } catch (err) {
    // Never surface a 500: the site sends this fire-and-forget and Netlify Forms
    // already holds a copy. Check View -> Executions in the editor for details.
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
    throw new Error(
      'No spreadsheet. This script is not bound to a Sheet -- set SPREADSHEET_ID.'
    );
  }
  return active;
}

/** The Submissions sheet, created with headers on first use. */
function sheet_() {
  const ss = book_();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function notify_(p) {
  if (!NOTIFY_EMAIL) return;
  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: 'BFunded waitlist: ' + (p.name || 'Someone') + ' (' + (p.role || 'unspecified') + ')',
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
        'Full history: ' + book_().getUrl(),
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

/** Run once from the editor to check the sheet + email wiring end to end. */
function testSubmission() {
  const res = doPost({
    parameter: {
      name: 'Test Founder',
      email: 'test@example.com',
      role: 'Founder',
      company: 'Test Co',
      website: 'https://example.com',
      source: '/',
    },
  });
  console.log(res.getContent());
}
