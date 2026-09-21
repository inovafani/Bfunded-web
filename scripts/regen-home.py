#!/usr/bin/env python3
"""
Regenerate app/_content/home.html from the design capture in
public/contoh/home-new-3.html.

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
  4. A mobile menu. The design hides .navmid below 900px and offers nothing in
     its place, so /engine and /about are unreachable on a phone. A hamburger
     and a full-screen drawer are added.
  5. Founder cards on mobile. The design's stacking rule targets `.fdr`, which
     `.fdr.rev` (0,0,2,0) outranks -- so the reversed card keeps its two-column
     grid on a phone and the bio collapses into a sliver beside the photo.
  6. The five-tests section on mobile. It is the only content section the
     design gives `padding: 0`, which works solely because the >=900px snap
     rules hand it a 100vh flex box. Below that it collapses onto its own
     content and sits flush under the nav.
  7. The submit handler. The design posts to "/" -- which on Netlify's Next
     runtime just returns the prerendered page, losing the submission -- and
     shows the thank-you from .catch() as well, so failures look like successes.
     It is repointed at /__forms.html (Netlify Forms) with a fire-and-forget
     mirror to the Google Apps Script endpoint, and real success/failure states.

Verify after running:  npm run build && npm start, then compare against
public/contoh/home-new-3.html.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public' / 'contoh' / 'home-new-3.html'
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
    '      </div>\n'
    '      <button\n'
    '        class="navburger"\n'
    '        id="navburger"\n'
    '        type="button"\n'
    '        aria-label="Open menu"\n'
    '        aria-expanded="false"\n'
    '        aria-controls="navdrawer"\n'
    '      >\n'
    '        <span></span><span></span><span></span>\n'
    '      </button>\n'
    '      <div class="navdrawer" id="navdrawer">\n'
    '        <a href="/engine">Platform</a>\n'
    '        <a href="/about">About</a>\n'
    '        <a class="ddcta" href="#signup">Get Started</a>\n'
    '      </div>'
)
# The design centres the nav links between the logo and the CTA. We want them
# beside the logo instead. Appended as an override rather than edited into the
# design's own rule, so it still applies if that rule is restyled upstream.
#
# The rest is the mobile menu. Below 900px the design hides .navmid and puts
# nothing in its place, leaving the CTA as the only control in the bar -- so
# /engine and /about simply cannot be reached from a phone. The burger sits
# above the drawer it opens; the logo stays above it too, so the bar still
# reads as the bar once the overlay is up.
NAV_EXTRA = """
<style>
  /* nav links beside the logo, not centred */
  nav .navmid { margin-left: 40px; margin-right: auto; }

  /* --- mobile menu (not in the design) --- */
  .navburger,
  .navdrawer { display: none; }

  @media (max-width: 900px) {
    .brand { position: relative; z-index: 2; }

    /* the burger is the only control in the collapsed bar -- the CTA would
       crowd it, and the drawer already carries its own */
    .navcta { display: none; }

    .navburger {
      display: flex;
      order: 3;
      z-index: 2;
      flex-direction: column;
      justify-content: center;
      gap: 5px;
      width: 44px;
      height: 44px;
      margin-left: auto;
      margin-right: -10px;
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
    }
    .navburger span {
      display: block;
      width: 24px;
      height: 2px;
      margin: 0 auto;
      border-radius: 2px;
      background: #fff;
      transition: transform 0.3s ease, opacity 0.2s ease;
    }
    .navburger[aria-expanded="true"] span:nth-child(1) {
      transform: translateY(7px) rotate(45deg);
    }
    .navburger[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
    .navburger[aria-expanded="true"] span:nth-child(3) {
      transform: translateY(-7px) rotate(-45deg);
    }

    .navdrawer {
      display: flex;
      position: fixed;
      inset: 0;
      z-index: 1;
      flex-direction: column;
      justify-content: center;
      padding: 0 8vw;
      background: rgba(8, 13, 9, 0.97);
      -webkit-backdrop-filter: blur(10px);
      backdrop-filter: blur(10px);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }
    .navdrawer.open { opacity: 1; visibility: visible; }
    .navdrawer a {
      padding: 20px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      font-family: "Manrope", sans-serif;
      font-size: 26px;
      font-weight: 500;
      letter-spacing: -0.01em;
      color: #fff;
    }
    .navdrawer a.ddcta {
      align-self: flex-start;
      margin-top: 34px;
      padding: 14px 30px;
      border-bottom: 0;
      border-radius: 999px;
      background: var(--pill);
      font-size: 17px;
      font-weight: 600;
    }
  }
</style>
<script>
  // This block is injected above the markup it drives, so it waits.
  document.addEventListener("DOMContentLoaded", function () {
    var burger = document.getElementById("navburger");
    var drawer = document.getElementById("navdrawer");
    if (!burger || !drawer) return;

    function setOpen(open) {
      drawer.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
    }

    burger.addEventListener("click", function () {
      setOpen(burger.getAttribute("aria-expanded") !== "true");
    });

    // Platform and About are full page loads, but #signup is a same-page jump:
    // without this the drawer stays sitting over the form it scrolled to.
    drawer.addEventListener("click", function (ev) {
      if (ev.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") setOpen(false);
    });

    // Rotating to landscape past the breakpoint hides the drawer by media
    // query alone -- which would strand the scroll lock with no way to clear it.
    var wide = window.matchMedia("(min-width: 901px)");
    var onWide = function (e) { if (e.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener("change", onWide);
    else wide.addListener(onWide);
  });
</script>
"""

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
    html = html[:ins] + NAV_EXTRA + html[ins:]

    explore = '<h4>Explore</h4>'
    if html.count(explore) != 1:
        fail(f'expected exactly one footer Explore column, found {html.count(explore)}')
    ul_start = html.find('<ul>', html.index(explore))
    ul_end = html.find('</ul>', ul_start)
    if ul_start == -1 or ul_end == -1:
        fail('could not find the footer Explore list')
    html = html[:ul_start] + FOOTER_LINKS + html[ul_end + len('</ul>'):]

    # 5 - founder cards stack on mobile
    #
    # The design writes `.fdr { grid-template-columns: 1fr }` inside the 900px
    # query, but `.fdr.rev` sets 1.42fr/0.58fr at higher specificity (0,0,2,0)
    # and is never reset -- so every reversed card keeps two columns on a phone
    # and its bio is squeezed into a ~120px gutter beside the photo.
    # `.fpic`'s 400px cap is dropped with it: once the card is one column the
    # photo is full-bleed, and the cap crops it.
    old_stack = (
        '      @media (max-width: 900px) {\n'
        '        .fdr {\n'
        '          grid-template-columns: 1fr;\n'
    )
    new_stack = (
        '      @media (max-width: 900px) {\n'
        '        .fdr,\n'
        '        .fdr.rev {\n'
        '          grid-template-columns: 1fr;\n'
    )
    if html.count(old_stack) != 1:
        fail(f'expected exactly one .fdr mobile rule, found {html.count(old_stack)}')
    html = html.replace(old_stack, new_stack, 1)

    cap = '        .fdr.rev .fpic {\n          order: 0;\n        }\n'
    if html.count(cap) != 1:
        fail('could not find the .fdr.rev .fpic rule to anchor the photo cap')
    html = html.replace(cap, cap + '        .fpic {\n          max-height: none;\n        }\n', 1)

    # 6 - .gates100 breathes on mobile
    #
    # Every other section carries 120-200px of vertical padding; .gates100 is
    # written `padding: 0` because the min-width:900px snap block already gives
    # it `height: 100vh; display: flex; align-items: center`. That block is
    # desktop-only, so on a phone the section has no height rule, no padding
    # and no reason to be a flex box -- the kicker ends up jammed against the
    # nav. The desktop declarations are left where they are and stripped from
    # the base rule, which is the only place they do harm.
    old_gates = (
        '      .gates100 {\n'
        '        background: var(--ink);\n'
        '        display: flex;\n'
        '        align-items: center;\n'
        '        padding: 0;\n'
        '      }\n'
    )
    new_gates = (
        '      .gates100 {\n'
        '        background: var(--ink);\n'
        '        padding: 120px 0;\n'
        '      }\n'
    )
    if html.count(old_gates) != 1:
        fail(f'expected exactly one .gates100 base rule, found {html.count(old_gates)}')
    html = html.replace(old_gates, new_gates, 1)

    if '.gates100,' not in html:
        fail('.gates100 is no longer in the desktop snap block -- it needs its '
             '100vh flex centring back before the base rule is stripped')

    # Test 005's label is "Every expert in your industry"; inline after the
    # number it wraps into a ragged second line on a 393px screen.
    old_rows = (
        '      @media (max-width: 700px) {\n'
        '        .gate {\n'
        '          grid-template-columns: 1fr;\n'
        '          gap: 8px;\n'
        '        }\n'
        '        .gate .gval {\n'
        '          text-align: left;\n'
        '        }\n'
        '      }\n'
    )
    new_rows = (
        '      @media (max-width: 700px) {\n'
        '        .gates100 {\n'
        '          padding: 92px 0;\n'
        '        }\n'
        '        .gates {\n'
        '          margin-top: 38px;\n'
        '        }\n'
        '        .gate {\n'
        '          grid-template-columns: 1fr;\n'
        '          gap: 6px;\n'
        '          padding: 24px 0;\n'
        '        }\n'
        '        .gate .gval {\n'
        '          text-align: left;\n'
        '        }\n'
        '        .gate .gval i {\n'
        '          display: block;\n'
        '          margin-left: 0;\n'
        '          margin-top: 7px;\n'
        '        }\n'
        '      }\n'
    )
    if html.count(old_rows) != 1:
        fail(f'expected exactly one .gate mobile block, found {html.count(old_rows)}')
    html = html.replace(old_rows, new_rows, 1)

    # 7 - submit handler
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
    print(f'  mobile menu           : hamburger + drawer added')
    print(f'  founder cards         : .fdr.rev stacks below 900px')
    print(f'  five tests            : mobile padding + row rhythm')
    print(f'  submit handler        : repointed at /__forms.html + Sheets mirror')


if __name__ == '__main__':
    main()
