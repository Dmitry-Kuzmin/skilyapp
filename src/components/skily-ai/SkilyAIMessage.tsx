import React from "react";
import { cn } from "@/lib/utils";
import { SkilyAICharacter, SkilyAIMood } from "./SkilyAICharacter";
import ReactMarkdown from "react-markdown";

interface SkilyAIMessageProps {
  content: string;
  mood?: SkilyAIMood;
  showAvatar?: boolean;
  className?: string;
  isStreaming?: boolean;
}

export const SkilyAIMessage = ({
  content,
  mood = "idle",
  showAvatar = true,
  className,
  isStreaming = false
}: SkilyAIMessageProps) => {
  return (
    <div className={cn("flex gap-3 items-start animate-message-appear", className)}>
      {showAvatar && (
        <div className="flex-shrink-0 mt-1">
          <SkilyAICharacter size="sm" mood={mood} />
        </div>
      )}

      <div className="flex-1 space-y-2">
        <div className="bg-muted/50 dark:bg-slate-800/50 rounded-2xl rounded-tl-sm px-4 py-3 border border-border transition-all shadow-sm">
          <div className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>

          {isStreaming && (
            <div className="flex gap-1 mt-2">
              <span className="typing-dot bg-yellow-600 dark:bg-yellow-400" />
              <span className="typing-dot bg-yellow-600 dark:bg-yellow-400" />
              <span className="typing-dot bg-yellow-600 dark:bg-yellow-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


