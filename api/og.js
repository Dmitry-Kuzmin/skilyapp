import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const PAGE_META = {
  '/curso': { title: 'Curso Online DGT', subtitle: '16 clases en vivo · Teoría en ruso · 9/10 aprueban', emoji: '🎓' },
  '/tests': { title: 'Tests DGT Gratis', subtitle: '+3000 preguntas oficiales · Simulacro completo', emoji: '📝' },
  '/games': { title: 'Juegos DGT', subtitle: 'Aprende conduciendo · Duelos en tiempo real', emoji: '🎮' },
  '/pricing': { title: 'Precios Skilyapp', subtitle: 'Empieza gratis · Pro sin límites', emoji: '💎' },
  '/dgt-tests': { title: 'Simulacro Examen DGT', subtitle: '30 preguntas · 30 min · Formato oficial', emoji: '🚗' },
  '/road-signs': { title: 'Señales de Tráfico España', subtitle: 'Guía visual completa con significados', emoji: '🚦' },
  '/blog': { title: 'Blog DGT', subtitle: 'Guías y consejos para aprobar el carnet', emoji: '📖' },
  '/guides': { title: 'Guías DGT', subtitle: 'Cómo aprobar el examen teórico', emoji: '📚' },
  '/about': { title: 'Sobre Skilyapp', subtitle: 'Autoescuela online con IA para España', emoji: '🏫' },
  '/partners': { title: 'Partners Skilyapp', subtitle: 'Colabora y gana comisiones', emoji: '🤝' },
  '/referrals': { title: 'Invita y Gana', subtitle: 'Programa de referidos Skilyapp', emoji: '🎁' },
  '/features': { title: 'Funcionalidades', subtitle: 'IA, Tests DGT, Juegos, Duelos y Más', emoji: '⚡' },
  '/help': { title: 'Ayuda Skilyapp', subtitle: 'Centro de ayuda y soporte', emoji: '💬' },
};

const DEFAULT_META = { title: 'Skilyapp', subtitle: 'Test DGT 2026 · Autoescuela Online con IA', emoji: '🚗' };

function h(type, props, ...children) {
  return { type, props: { ...props, children: children.length === 1 ? children[0] : children } };
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path') || '/';
  const customTitle = searchParams.get('title');
  const customSubtitle = searchParams.get('subtitle');

  let meta = PAGE_META[path] || DEFAULT_META;

  if (customTitle) {
    meta = { ...meta, title: customTitle, subtitle: customSubtitle || meta.subtitle };
  } else if (path.startsWith('/article/') || path.startsWith('/guides/')) {
    const slug = path.split('/').filter(Boolean).pop() || '';
    const humanTitle = slug.replace(/-/g, ' ').replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
    meta = {
      title: humanTitle,
      subtitle: path.startsWith('/guides/') ? 'Guia DGT - Skilyapp' : 'Blog DGT - Skilyapp',
      emoji: path.startsWith('/guides/') ? '📚' : '📖',
    };
  }

  const titleFontSize = meta.title.length > 40 ? 52 : 68;

  // Load logo as base64
  const logoUrl = 'https://skilyapp.com/android-chrome-192x192.png';
  const logoData = await fetch(logoUrl).then((r) => r.arrayBuffer());
  const logoBase64 = `data:image/png;base64,${Buffer.from(logoData).toString('base64')}`;

  return new ImageResponse(
    h('div', {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        padding: '60px 72px',
        fontFamily: 'sans-serif',
      },
    },
      /* Logo row */
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '20px' } },
        h('div', {
          style: {
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
          },
        }, '🚗'),
        h('span', {
          style: { fontSize: '40px', fontWeight: '900', color: 'white' },
        }, 'Skilyapp'),
      ),

      /* Main content */
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px' } },
        h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(37,99,235,0.2)',
            border: '1px solid rgba(59,130,246,0.4)',
            borderRadius: '100px',
            padding: '8px 20px',
          },
        },
          h('span', { style: { fontSize: '24px' } }, meta.emoji),
          h('span', { style: { color: '#93c5fd', fontSize: '20px', fontWeight: '600' } }, meta.subtitle),
        ),
        h('div', {
          style: {
            fontSize: String(titleFontSize) + 'px',
            fontWeight: '900',
            color: 'white',
            lineHeight: '1.1',
          },
        }, meta.title),
      ),

      /* Bottom bar */
      h('div', {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
      },
        h('span', { style: { color: '#64748b', fontSize: '22px' } }, 'skilyapp.com'),
        h('div', {
          style: {
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            borderRadius: '12px',
            padding: '14px 32px',
            color: 'white',
            fontSize: '22px',
            fontWeight: '700',
          },
        }, 'Test DGT Gratis'),
      ),
    ),
    { width: 1200, height: 630 },
  );
}
