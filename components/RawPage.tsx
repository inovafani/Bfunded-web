/**
 * Renders a captured page verbatim.
 *
 * The three routes are faithful reproductions of the original standalone
 * deploys, so their markup, <style> blocks and <script> tags are injected
 * exactly as published rather than rewritten as components. Because this is
 * server-rendered into the initial HTML document (not assigned via innerHTML on
 * the client), the browser parses and executes those inline scripts normally --
 * so DOMContentLoaded handlers, sliders and tabs behave as on the originals.
 *
 * `suppressHydrationWarning` is essential, not cosmetic. Those scripts mutate
 * the DOM (Webflow rewrites nodes, the sliders set inline styles) *before*
 * React hydrates, so the live DOM no longer matches the HTML string React is
 * holding. Without this, React treats that as a mismatch and re-creates the
 * subtree -- which wipes out everything the scripts did and forces every image
 * to reload. Suppressing it tells React this subtree is not its to reconcile.
 *
 * `bodyClass` carries the class the original page put on its <body>. The root
 * layout's <body> is shared by every route and cannot vary per page, so it is
 * applied to this wrapper instead -- equivalent here because `.body-24` only
 * sets inherited font properties.
 *
 * Consequence to be aware of: internal navigation uses plain <a> tags, so
 * moving between routes is a full page load. That is deliberate -- it keeps
 * each page's global CSS from ever coexisting with another's.
 */
export default function RawPage({
  html,
  bodyClass,
}: {
  html: string;
  bodyClass?: string;
}) {
  return (
    <div
      className={bodyClass}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
