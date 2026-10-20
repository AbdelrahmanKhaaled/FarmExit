import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^logo-(horizontal|full|icon)-(light|dark)\.svg$/.test(file)) return new Response(null, { status: 404 });
  try {
    return new Response(new Uint8Array(await readFile(resolve(process.cwd(), '../../public/brand', file))), {
      headers: { 'content-type': 'image/svg+xml' },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
