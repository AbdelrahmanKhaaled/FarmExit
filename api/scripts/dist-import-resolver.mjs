/** Resolves extensionless relative imports emitted under api/dist (NodeNext ESM). */
export async function resolve(specifier, context, nextResolve) {
  const parent = context.parentURL ?? '';
  if (parent.replace(/\\/g, '/').includes('/dist/') && specifier.startsWith('.')) {
    const hasExt = /\.[a-z]+$/i.test(specifier.split('/').pop() ?? '');
    if (!hasExt) {
      try {
        return await nextResolve(`${specifier}.js`, context);
      } catch {
        // fall through
      }
    }
  }
  return nextResolve(specifier, context);
}
