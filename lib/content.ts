import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Loads a captured page's markup from `app/_content/<name>.html`.
 *
 * Kept as plain .html rather than an imported string so the files stay
 * hand-editable: real syntax highlighting, real line numbers, no JSON escaping.
 *
 * The read happens at build time -- every route using it is statically
 * prerendered -- so there is no filesystem access at request time.
 */
export function loadContent(name: 'home' | 'about' | 'engine' | 'invest'): string {
  return readFileSync(path.join(process.cwd(), 'app', '_content', `${name}.html`), 'utf8');
}
