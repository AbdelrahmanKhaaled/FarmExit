/** Resolves extensionless relative imports emitted under api/dist (NodeNext ESM). */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  const parent = context.parentURL ?? '';
  if (parent.replace(/\\/g, '/').includes('/dist/') && specifier.startsWith('.')) {
    const base = specifier.split('/').pop() ?? '';
    const hasExt = /\.[a-z]+$/i.test(base);
    if (!hasExt) {
      const parentDir = path.dirname(fileURLToPath(parent));
      const fileUrl = pathToFileURL(path.join(parentDir, `${specifier}.js`)).href;
      return nextResolve(fileUrl, context);
    }
  }
  return nextResolve(specifier, context);
}
