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
  3. Navbar and footer links. The design's are all same-page anchors, so
     /engine and /about would be unreachable from the home page. Both lists are
     replaced with those two routes; the "Get Started" CTA is left alone.
  4. Section order. The campus tiles are moved up to sit directly after the
     "What if due diligence was free?" panel.
  5. The submit handler. The design posts to "/" -- which on Netlify's Next
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

# The design's navbar and footer link only to anchors on its own page. Both are
# replaced with the two real routes this app serves. The "Get Started" CTA is
# left alone -- it is the only way into the signup form.
NAV_HTML = (
    '<div class="navmid">\n'
    '        <a href="/engine">Platform</a>\n'
    '        <a href="/about">About</a>\n'
    '      </div>'
)
# The design centres the nav links between the logo and the CTA. We want them
# beside the logo instead. Appended as an override rather than edited into the
# design's own rule, so it still applies if that rule is restyled upstream.
# Left untouched: the max-width:900px rule that hides .navmid on mobile.
NAV_STYLE = (
    '\n<style>\n'
    '  /* nav links beside the logo, not centred */\n'
    '  nav .navmid { margin-left: 40px; margin-right: auto; }\n'
    '</style>\n'
)

FOOTER_LINKS = (
    '<ul>\n'
    '              <li><a href="/engine">Platform</a></li>\n'
    '              <li><a href="/about">About</a></li>\n'
    '            </ul>'
)

ERROR_EL = (
    '<p class="thanks" id="enq-error" style="display: none">\n'
    '              Sorry, something went wrong. Please email\n'
    '              <a href="mailto:invest@bfunded.io">invest@bfunded.io</a>.\n'
    '            </p>\n            '
)


def section_span(html, class_name):
    """Start/end offsets of a top-level <section class="...NAME..."> block.

    Walks nested <section> tags so the matching </section> is the right one.
    """
    m = re.search(r'<section\b[^>]*class="[^"]*\b' + re.escape(class_name) + r'\b[^"]*"[^>]*>', html)
    if not m:
        return None
    depth, i = 1, m.end()
    while i < len(html) and depth:
        nxt_open = html.find('<section', i)
        nxt_close = html.find('</section>', i)
        if nxt_close == -1:
            return None
        if nxt_open != -1 and nxt_open < nxt_close:
            depth += 1
            i = nxt_open + len('<section')
        else:
            depth -= 1
            i = nxt_close + len('</section>')
    return (m.start(), i)


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

    # 3 - navbar and footer point at the real routes, not same-page anchors
    nav_open = '<div class="navmid">'
    if html.count(nav_open) != 1:
        fail(f'expected exactly one .navmid nav, found {html.count(nav_open)}')
    nav_start = html.index(nav_open)
    nav_end = html.find('</div>', nav_start)
    if nav_end == -1:
        fail('could not find the end of the .navmid nav')
    html = html[:nav_start] + NAV_HTML + html[nav_end + len('</div>'):]

    # nav links to the left, beside the logo
    last_style = html.rfind('</style>')
    if last_style == -1:
        fail('no <style> block found -- cannot append the nav override')
    ins = last_style + len('</style>')
    html = html[:ins] + NAV_STYLE + html[ins:]

    explore = '<h4>Explore</h4>'
    if html.count(explore) != 1:
        fail(f'expected exactly one footer Explore column, found {html.count(explore)}')
    ul_start = html.find('<ul>', html.index(explore))
    ul_end = html.find('</ul>', ul_start)
    if ul_start == -1 or ul_end == -1:
        fail('could not find the footer Explore list')
    html = html[:ul_start] + FOOTER_LINKS + html[ul_end + len('</ul>'):]

    # 4 - section order: the campus tiles read better straight after the
    # "What if due diligence was free?" panel than buried further down.
    campus = section_span(html, 'campus')
    if not campus:
        fail('could not find the .campus section to move')
    block = html[campus[0]:campus[1]]
    rest = html[:campus[0]].rstrip() + '\n\n' + html[campus[1]:].lstrip('\n')

    free = section_span(rest, 'free')
    if not free:
        fail('could not find the .free section to move .campus after')
    html = rest[:free[1]] + '\n\n    ' + block + rest[free[1]:]

    # 5 - submit handler
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
    print(f'  nav + footer links    : Platform (/engine), About (/about)')
    print(f'  nav alignment         : links moved beside the logo')
    print(f'  section order         : .campus moved below .free')
    print(f'  submit handler        : repointed at /__forms.html + Sheets mirror')


if __name__ == '__main__':
    main()
