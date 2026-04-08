export const config = { runtime: 'edge' };

export default function handler(req) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path') || '/';
  return new Response(JSON.stringify({ ok: true, path }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
