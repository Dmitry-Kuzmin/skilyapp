import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Sparkles, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignWidget } from '@/components/chat/SignWidget';
import { TrialCTA } from '@/components/monetization/TrialCTA';
import { toast } from 'sonner';

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
    } else if (upperType === 'MEME' && upperParam.startsWith('BADGE:')) {
      const badgeName = param.split(':').slice(1).join(':').trim() || 'Новичок';
      elements.push(
        <div key={key} className="my-4 p-4 rounded-2xl bg-gradient-to-br from-yellow-400/20 via-orange-500/10 to-pink-500/20 border border-orange-200/50 shadow-inner overflow-hidden relative group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all" />
          <div className="relative z-10 flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-lg border-2 border-orange-400/30 mb-1 ring-4 ring-orange-400/10">
              <Sparkles className="w-8 h-8 text-orange-500 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-orange-600 dark:text-orange-400 tracking-tighter uppercase">Достижение разблокировано!</h4>
              <p className="text-xl font-extrabold text-slate-800 dark:text-white leading-tight">{badgeName}</p>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[200px]">Это достижение подтверждено в блокчейне Memelandia!</p>
            <Button size="sm" className="bg-slate-900 text-white rounded-full px-6 font-bold text-xs h-8 hover:scale-105 transition-transform active:scale-95" onClick={() => toast.success('Скопировано в буфер для Share!')}>
              <Languages className="w-3 h-3 mr-2" />
              Поделиться в Story
            </Button>
          </div>
        </div>
      );
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
