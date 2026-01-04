import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const dataUrl: string | undefined = body?.dataUrl;

    if (!dataUrl || typeof dataUrl !== 'string') {
      return NextResponse.json({ error: 'Missing dataUrl' }, { status: 400 });
    }

    const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid data URL' }, { status: 400 });
    }

    const ext = match[2] === 'png' ? 'png' : 'jpg';
    const base64 = match[3];
    const buffer = Buffer.from(base64, 'base64');

    const publicShared = path.join(process.cwd(), 'public', '_shared');
    await fs.mkdir(publicShared, { recursive: true });

    const id = cryptoSafeId();
    const filePath = path.join(publicShared, `${id}.${ext}`);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ id });
  } catch (err) {
    console.error('share/create error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function cryptoSafeId() {
  try {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {}
  const r = Math.floor(Math.random() * 0xffffff).toString(16);
  return `${Date.now().toString(36)}-${r}`;
}

// Diagnostic GET handler: temporary helper to verify route is reachable.
export async function GET() {
  try {
    return NextResponse.json({ ok: true, route: '/api/share/create' });
  } catch (err) {
    return NextResponse.json({ error: 'GET handler error' }, { status: 500 });
  }
}
