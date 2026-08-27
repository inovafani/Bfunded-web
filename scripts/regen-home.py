#!/usr/bin/env python3
"""
Regenerate app/_content/home.html from the design capture in
public/contoh/home-new.html.

Run this whenever a new design lands:

    python3 scripts/regen-home.py

It keeps the design byte-for-byte except for three things it must change:

  1. Asset paths. The design writes `assets/x.jpg` (flat); the repo stores
     those files in `public/assets/home/`.
  2. An error state. The design has a success message but no failure one, so a
     failed submission would leave the visitor with no feedback.
  3. Cross-page nav links. The design's navbar is all same-page anchors, so
     /engine and /about would be unreachable from the home page.
  4. The submit handler. The design posts to "/" -- which on Netlify's Next
     runtime just returns the prerendered page, losing the submission -- and
     shows the thank-you from .catch() as well, so failures look like successes.
     It is repointed at /__forms.html (Netlify Forms) with a fire-and-forget
     mirror to the Google Apps Script endpoint, and real success/failure states.

Verify after running:  npm run build && npm start, then compare against
public/contoh/home-new.html.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public' / 'contoh' / 'home-new.html'
DST = ROOT / 'app' / '_content' / 'home.html'

STYLE = re.compile(r'<style[^>]*>.*?</style\s*>', re.S)
SCRIPT = re.compile(r'<script[^>]*>.*?</script\s*>', re.S)

SUBMIT_HANDLER = '''      // form
      //
      // Two changes from the design file, both deliberate:
      //  1. It posted to "/" -- on Netlify's Next runtime that just returns the
      //     prerendered page, so submissions were silently lost. Netlify Forms
      //     is reached through /__forms.html (declared in public/__forms.html).
      //  2. It showed the thank-you on .catch() as well, so a failed submission
      //     looked successful. Failures now say so.
      var form = document.getElementById("enq-form");
      var sheetsMeta = document.querySelector('meta[name="bf-sheets-endpoint"]');
      var sheetsUrl = sheetsMeta && sheetsMeta.getAttribute("content");

      form.addEventListener("submit", function (ev) {
        ev.preventDefault();

        var btn = document.getElementById("send-btn");
        var label = btn && btn.textContent;
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Sending...";
        }

        var data = new FormData(form);
        data.append("source", location.pathname);
        var body = new URLSearchParams(data).toString();

        // Mirror to the Google Sheet (row + email). Fire-and-forget: no-cors
        // means the reply is unreadable, and a Sheets outage must never block
        // the real submission.
        if (sheetsUrl) {
          try {
            fetch(sheetsUrl, {
              method: "POST",
              mode: "no-cors",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: body,
            }).catch(function () {});
          } catch (err) {}
        }

        // Netlify Forms is the system of record.
        fetch("/__forms.html", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body,
        })
          .then(function (r) {
            if (!r.ok) throw new Error(r.status);
            form.style.display = "none";
            document.getElementById("enq-thanks").style.display = "block";
          })
          .catch(function () {
            document.getElementById("enq-error").style.display = "block";
            if (btn) {
              btn.disabled = false;
              btn.textContent = label;
            }
          });
'''

# The design's navbar links only to anchors on its own page. These two routes
# exist in this app and need a way in; labels agreed with the team.
NAV_LINKS = (
    '\n        <a href="/engine">Platform</a>'
    '\n        <a href="/about">About</a>'
)

ERROR_EL = (
    '<p class="thanks" id="enq-error" style="display: none">\n'
    '              Sorry, something went wrong. Please email\n'
    '              <a href="mailto:invest@bfunded.io">invest@bfunded.io</a>.\n'
    '            </p>\n            '
)


def fail(msg):
    sys.exit(f'regen-home: {msg}')


def main():
    src = SRC.read_text(encoding='utf-8', errors='replace')

    head = src[src.find('<head'):src.find('</head')]
    body = src[src.find('>', src.find('<body')) + 1:src.rfind('</body')]
    html = '\n'.join(STYLE.findall(head) + SCRIPT.findall(head)) + '\n' + body

    # 1 - asset paths
    n_assets = len(re.findall(r'["\'(]assets/', html)) + len(re.findall(r'&quot;assets/', html))
    html = re.sub(r'(?<=["\'(])assets/', '/assets/home/', html)
    html = html.replace('&quot;assets/', '&quot;/assets/home/')
    if n_assets == 0:
        fail('no assets/ paths found -- has the design changed shape?')

    # every referenced asset must exist, or the page renders with holes
    missing = [u for u in set(re.findall(r'/assets/home/[^"\')\s&]+', html))
               if not (ROOT / 'public' / u.lstrip('/')).exists()]
    if missing:
        fail('missing assets: ' + ', '.join(sorted(missing)))

    # 2 - error state
    anchor = '<p class="thanks" id="enq-thanks">'
    if html.count(anchor) != 1:
        fail(f'expected exactly one #enq-thanks, found {html.count(anchor)}')
    html = html.replace(anchor, ERROR_EL + anchor, 1)

    # 3 - cross-page nav links
    nav_open = '<div class="navmid">'
    if html.count(nav_open) != 1:
        fail(f'expected exactly one .navmid nav, found {html.count(nav_open)}')
    nav_end = html.find('</div>', html.index(nav_open))
    if nav_end == -1:
        fail('could not find the end of the .navmid nav')
    if '/engine' in html[:nav_end] or '/about' in html[:nav_end]:
        fail('nav already contains /engine or /about -- design may now include them')
    # insert straight after the last existing link, so no orphan blank line
    head, tail = html[:nav_end].rstrip(), html[nav_end:]
    html = head + NAV_LINKS + '\n      ' + tail

    # 4 - submit handler
    start = html.find('      // form\n      var form = document.getElementById("enq-form");')
    if start == -1:
        fail('could not find the design\'s submit handler -- inspect it by hand')
    catch = html.find('.catch(function ()', start)
    end = html.find('      });\n', catch) + len('      });\n')
    html = html[:start] + SUBMIT_HANDLER + html[end:]

    # sanity: no unclosed tags (a malformed </a once broke the footer silently)
    for tag in ('a', 'div', 'span', 'p', 'form', 'label', 'button', 'section'):
        if re.search(r'</' + tag + r'(?![\s>a-zA-Z-])', html):
            fail(f'malformed closing tag </{tag}')

    DST.write_text(html, encoding='utf-8')
    print(f'wrote {DST.relative_to(ROOT)}  ({len(html)} chars, {html.count(chr(10)) + 1} lines)')
    print(f'  asset paths rewritten : {n_assets}')
    print(f'  error state added     : yes')
    print(f'  nav links added       : /engine (Platform), /about (About)')
    print(f'  submit handler        : repointed at /__forms.html + Sheets mirror')


if __name__ == '__main__':
    main()
