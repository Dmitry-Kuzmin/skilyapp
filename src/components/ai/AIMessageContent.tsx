import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignWidget } from '@/components/chat/SignWidget';
import { TrialCTA } from '@/components/monetization/TrialCTA';


type AIMessageContentProps = {
  content: string;
  className?: string;
  onOpenPremium?: () => void;
};

const LEGACY_PAYMENT_PATTERNS = [
  /\[WIDGET:\s*TON:[^\]]+\]/i,
  /\[WIDGET:\s*STARS:\s*PAY\]/i,
  /\bTelegram Stars\b/i,
  /\bTonkeeper\b/i,
  /\bTON Connect\b/i,
  /\bTON-кошелек\b/i,
  /\bTON кошелек\b/i,
  /\bTON\b/i,
];

function normalizeLegacyPaymentContent(content: string): { content: string; legacyDetected: boolean } {
  const legacyDetected = LEGACY_PAYMENT_PATTERNS.some((pattern) => pattern.test(content));
  if (!legacyDetected) return { content, legacyDetected: false };

  let normalized = content
    .replace(/\[WIDGET:\s*TON:\s*CONNECT\]/gi, '[WIDGET:CTA:PREMIUM:Открыть тарифы]')
    .replace(/\[WIDGET:\s*TON:\s*PAY:[^\]]+\]/gi, '[WIDGET:CTA:PREMIUM:Открыть тарифы]')
    .replace(/\[WIDGET:\s*STARS:\s*PAY\]/gi, '[WIDGET:CTA:PREMIUM:Открыть тарифы]')
    .replace(/\bTelegram Stars\b/gi, 'карта или крипта')
    .replace(/\bTonkeeper\b/gi, 'крипто-кошелёк')
    .replace(/\bTON Connect\b/gi, 'крипто-оплата')
    .replace(/\bTON-кошелек\b/gi, 'крипто-кошелёк')
    .replace(/\bTON кошелек\b/gi, 'крипто-кошелёк')
    .replace(/\bTON\b/gi, 'криптовалюта');

  normalized = normalized.replace(/\n{3,}/g, '\n\n').trim();
  return { content: normalized, legacyDetected: true };
}

const mdComponents = {
  p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
  li: ({ children }: any) => <li className="mb-1">{children}</li>,
  strong: ({ children }: any) => (
    <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1 rounded">{children}</span>
  ),
  em: ({ children }: any) => (
    <span className="font-semibold text-gray-900 dark:text-white not-italic">{children}</span>
  ),
  code: ({ children }: any) => <code className="bg-muted px-1 rounded text-xs">{children}</code>,
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-indigo-50 dark:bg-indigo-500/10">{children}</thead>,
  tbody: ({ children }: any) => <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>,
  tr: ({ children }: any) => <tr className="even:bg-slate-50/30 dark:even:bg-slate-800/20">{children}</tr>,
  th: ({ children }: any) => <th className="px-3 py-2 text-left font-bold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">{children}</th>,
  td: ({ children }: any) => <td className="px-3 py-2 text-slate-700 dark:text-slate-300 align-top">{children}</td>,
};

export function AIMessageContent({ content, className, onOpenPremium }: AIMessageContentProps) {
  if (!content) return null;

  const normalized = normalizeLegacyPaymentContent(content);
  content = normalized.content;

  const widgetRegex = /\[\s*(?:WIDGET|W)\s*:\s*(SIGN|CTA|MEME)\s*:\s*([^\]]+?)\s*\]/gi;
  const hasWidget = content.toLowerCase().includes('[widget:') || content.toLowerCase().includes('[w:');

  if (!hasWidget) {
    return (
      <div className={cn('text-sm leading-relaxed', className)}>
        <ReactMarkdown components={mdComponents} remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  widgetRegex.lastIndex = 0;

  while ((match = widgetRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      elements.push(
        <div key={`text-${lastIndex}`} className={cn('text-sm leading-relaxed', className)}>
          <ReactMarkdown components={mdComponents} remarkPlugins={[remarkGfm]}>
            {textBefore}
          </ReactMarkdown>
        </div>
      );
    }

    const [fullMatch, type, rawParam] = match;
    const upperType = type.toUpperCase();
    const param = rawParam.trim();
    const upperParam = param.toUpperCase();
    const key = `widget-${match.index}`;

    if (upperType === 'SIGN') {
      elements.push(<SignWidget key={key} code={param} />);
    } else if (upperType === 'CTA' && upperParam.startsWith('TRIAL')) {
      const trialLabel = param.split(':').slice(1).join(':').trim();
      elements.push(
        <div key={key} className="my-4">
          <TrialCTA variant="inline" />
          {trialLabel && <p className="mt-2 text-xs text-muted-foreground">{trialLabel}</p>}
        </div>
      );
    } else if (upperType === 'CTA' && upperParam.startsWith('PREMIUM')) {
      const ctaText = param.split(':').slice(1).join(':').trim() || 'Активировать Premium';
      elements.push(
        <div key={key} className="mt-3">
          <Button
            className="w-full h-auto py-3 px-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl shadow-lg border-none whitespace-normal text-center leading-snug"
            onClick={onOpenPremium}
          >
            <Sparkles className="w-4 h-4 mr-2 shrink-0" />
            {ctaText}
          </Button>
        </div>
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (normalized.legacyDetected && onOpenPremium && !/\[\s*WIDGET\s*:\s*CTA\s*:\s*PREMIUM:/i.test(content)) {
    elements.push(
      <div key="legacy-premium-cta" className="mt-3">
        <Button
          className="w-full h-auto py-3 px-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl shadow-lg border-none whitespace-normal text-center leading-snug"
          onClick={onOpenPremium}
        >
          <Sparkles className="w-4 h-4 mr-2 shrink-0" />
          Открыть тарифы
        </Button>
      </div>
    );
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText.trim()) {
    elements.push(
      <div key="text-end" className={cn('text-sm leading-relaxed', className)}>
        <ReactMarkdown components={mdComponents} remarkPlugins={[remarkGfm]}>
          {remainingText}
        </ReactMarkdown>
      </div>
    );
  }

  return <div className="space-y-2">{elements}</div>;
}
