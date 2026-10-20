import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

// Serve only existing public assets; do not duplicate or rewrite approved image bytes.
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const root = resolve(process.cwd(), '../../public/images');
  const { path } = await params;
  const file = resolve(root, ...path);
  if (!file.startsWith(root + sep)) return new Response(null, { status: 404 });
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };
  const type = types[extname(file)];
  if (!type) return new Response(null, { status: 404 });
  try {
    return new Response(new Uint8Array(await readFile(file)), { headers: { 'content-type': type } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
