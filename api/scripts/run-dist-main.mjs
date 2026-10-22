/**
 * Nest --exec target: registers dist ESM resolver, then runs compiled entry (dist/main.js).
 * Needed because tsc emits extensionless relative imports while package.json is "type": "module".
 */
import { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
register('./dist-import-resolver.mjs', import.meta.url);

const entry = process.argv[2] ?? path.join(dir, '..', 'dist', 'main.js');
await import(pathToFileURL(path.resolve(entry)).href);
