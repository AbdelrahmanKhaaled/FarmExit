/** Marks dist/ as CommonJS under api "type":"module", then runs the Nest entry file. */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const distPkg = path.join(root, 'dist', 'package.json');
fs.mkdirSync(path.dirname(distPkg), { recursive: true });
fs.writeFileSync(distPkg, `${JSON.stringify({ type: 'commonjs' })}\n`);

const fileArgs = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
const entry = fileArgs.length
  ? path.resolve(fileArgs[fileArgs.length - 1])
  : path.join(root, 'dist', 'main.js');
require(entry);
