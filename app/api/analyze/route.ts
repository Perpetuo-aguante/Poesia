import { NextResponse } from 'next/server';

// Proxies scansion requests to analysis-service (Rantanplan).
// Set RANTANPLAN_URL (e.g. https://perpetuo-rantanplan.onrender.com) to enable it;
// without it the app keeps using the local parser.

const TIMEOUT_MS = 25000;
const MAX_CHARS = 20000;

// Free hosts put the service to sleep when idle; allow time for it to wake.
export const maxDuration = 30;
// Never cache: the GET wake-up ping must actually reach the service.
export const dynamic = 'force-dynamic';

// Wake-up ping: the page calls this on load so the service is awake by the
// time someone submits a poem. The answer itself doesn't matter.
export async function GET() {
  const base = process.env.RANTANPLAN_URL;
  if (base) {
    await fetch(`${base.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(8000), cache: 'no-store' })
      .catch(() => undefined);
  }
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: Request) {
  const base = process.env.RANTANPLAN_URL;
  // Not configured: nothing to add, the client keeps its local reading.
  if (!base) return new NextResponse(null, { status: 204 });

  let text: unknown;
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, MAX_CHARS) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ error: `service ${res.status}` }, { status: 502 });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: 'service unavailable' }, { status: 504 });
  }
}
