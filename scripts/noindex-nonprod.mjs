// Run by netlify.toml for deploy previews and branch deploys only.
// Writes a _headers file so every response carries X-Robots-Tag: noindex.
import { writeFileSync } from 'node:fs';

if (process.env.CONTEXT === 'production') {
  console.log('noindex-nonprod: production context, nothing to do');
  process.exit(0);
}

writeFileSync('_headers', '/*\n  X-Robots-Tag: noindex, nofollow\n');
console.log(`noindex-nonprod: wrote _headers for context ${process.env.CONTEXT || 'unknown'}`);
