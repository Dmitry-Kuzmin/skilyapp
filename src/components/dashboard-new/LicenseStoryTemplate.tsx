import React, { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';

interface LicenseStoryTemplateProps {
  cardContent: React.ReactNode;
  referralCode: string;
  referralLink: string;
  readiness: number;
  isStatic?: boolean;
}

const OUTFIT = "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
const INTER = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

/**
 * Неоновый генерируемый QR-код с логотипом
 */
const NeonQRCode: React.FC<{ url: string }> = ({ url }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';

    const qrCode = new QRCodeStyling({
      width: 220,
      height: 220,
      data: url,
      margin: 0,
      qrOptions: {
        typeNumber: 0,
        mode: 'Byte',
        errorCorrectionLevel: 'M'
      },
      dotsOptions: {
        color: "#818CF8", // Светлый индиго
        type: "dots"      // Четкие точки для премиального вида
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color: "#6366F1"  // Глубокий индиго
      },
      cornersDotOptions: {
        type: "dot",
        color: "#818CF8"
      },
      backgroundOptions: {
        color: "transparent",
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 5
      }
    });

    qrCode.append(ref.current);
  }, [url]);

  return (
    <div 
      ref={ref} 
      style={{ 
        display: 'block', 
        width: '220px', 
        height: '220px',
        filter: 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.35))' 
      }} 
    />
  );
};

export const LicenseStoryTemplate: React.FC<LicenseStoryTemplateProps> = ({
  cardContent,
  referralCode,
  referralLink,
  readiness,
  isStatic = true,
}) => {
  // Финальный предохранитель от битых UTF-16
  const safeText = (text: any): string => {
    if (text === null || text === undefined) return '';
    const s = String(text);
    // Сначала сохраняем валидные пары, потом удаляем одинокие суррогаты
    return s.replace(/([\uD800-\uDBFF][\uDC00-\uDFFF])|[\uD800-\uDFFF]/g, (m, pair) => pair || '');
  };

  // Фильтруем пропы для предотвращения передаче isStatic в DOM
  const renderCardContent = () => {
    if (!React.isValidElement(cardContent)) return cardContent;
    
    // Если это HTML тег (string) - удаляем isStatic. 
    // Если это компонент (function/object) - оставляем.
    const isHtmlTag = typeof cardContent.type === 'string';
    
    const newProps: any = { ...cardContent.props };
    if (isHtmlTag) {
      delete newProps.isStatic;
    } else {
      newProps.isStatic = isStatic;
    }
    
    return React.cloneElement(cardContent as React.ReactElement, newProps);
  };

  return (
    <div
      id="license-story-template"
      style={{
        width: '1080px',
        height: '1920px',
        overflow: 'hidden',
        backgroundColor: '#0F1014',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '48px',
        color: '#fff',
        fontFamily: INTER,
        position: 'relative',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* Background Decor */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-10%', right: '-10%',
          width: '60%', height: '40%',
          background: 'rgba(79, 70, 229, 0.2)',
          filter: 'blur(150px)', borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-10%',
          width: '50%', height: '35%',
          background: 'rgba(168, 85, 247, 0.2)',
          filter: 'blur(150px)', borderRadius: '50%',
        }} />
      </div>

      {/* Top Section — Headlines */}
      <div style={{
        position: 'relative', zIndex: 10, width: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '24px', marginTop: '80px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 24px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '999px',
          whiteSpace: 'nowrap',
        }}>
          <span style={{
            fontSize: '28px', fontWeight: 900, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: '#818cf8',
            fontFamily: OUTFIT,
          }}>SKILY AI</span>
        </div>

        <h1 style={{
          fontSize: '100px', fontWeight: 900, textAlign: 'center',
          textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.0,
          fontFamily: OUTFIT, margin: 0,
        }}>
          МОЙ ШАНС СДАТЬ <br />
          <span style={{ color: '#818cf8' }}>DGT — {safeText(readiness)}%!</span>
        </h1>

        <p style={{
          fontSize: '32px', fontWeight: 700, color: '#71717a',
          textTransform: 'uppercase', letterSpacing: '0.3em',
          fontFamily: OUTFIT, margin: 0,
        }}>
          А ТЫ СДАШЬ С ПЕРВОГО РАЗА?
        </p>
      </div>

      {/* Center Section — The horizontal card */}
      <div style={{
        position: 'relative', zIndex: 10, width: '100%',
        display: 'flex', justifyContent: 'center',
        transform: 'scale(1.85)',
      }}>
        <div style={{ width: '500px', height: '310px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
          {renderCardContent()}
        </div>
      </div>

      {/* Bottom Section — Viral Hook */}
      <div style={{
        position: 'relative', zIndex: 10, width: '100%',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '48px', padding: '40px',
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', gap: '40px',
        marginBottom: '40px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <h2 style={{
            fontSize: '52px', fontWeight: 900, textTransform: 'uppercase',
            letterSpacing: '-0.01em', lineHeight: 1.1,
            fontFamily: OUTFIT, margin: 0,
          }}>
            СКАНИРУЙ, ЧТОБЫ <br />
            <span style={{ color: '#818cf8' }}>ВЫЗВАТЬ МЕНЯ НА ДУЭЛЬ</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            <span style={{
              fontSize: '24px', fontWeight: 700, color: '#71717a',
              textTransform: 'uppercase', letterSpacing: '0.15em',
              fontFamily: INTER,
            }}>Используй мой код:</span>
            <div style={{
              fontSize: '72px', fontWeight: 900,
              color: '#facc15',
              textTransform: 'uppercase',
              fontFamily: "'Courier New', Courier, monospace",
              letterSpacing: '-0.02em',
            }}>
              {safeText(referralCode)}
            </div>
            <p style={{ fontSize: '28px', fontWeight: 600, color: '#a1a1aa', fontFamily: INTER, margin: 0 }}>
              и получи +500 монет на Duel Pass
            </p>
          </div>
        </div>

        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '240px',
          height: '240px',
        }}>
          <NeonQRCode url={safeText(referralLink)} />
        </div>
      </div>

      {/* Watermark */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', textAlign: 'center',
        fontSize: '24px', fontWeight: 900, color: '#3f3f46',
        letterSpacing: '0.2em', fontFamily: OUTFIT,
        marginBottom: '40px',
        whiteSpace: 'nowrap',
      }}>
        @SKILYAPP_BOT • DGT THEORY SIMULATOR
      </div>
    </div>
  );
};
