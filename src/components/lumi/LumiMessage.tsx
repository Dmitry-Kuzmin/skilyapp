import React from "react";
import { cn } from "@/lib/utils";
import { LumiCharacter, LumiMood } from "./LumiCharacter";
import ReactMarkdown from "react-markdown";

interface LumiMessageProps {
  content: string;
  mood?: LumiMood;
  showAvatar?: boolean;
  className?: string;
  isStreaming?: boolean;
}

export const LumiMessage = ({ 
  content, 
  mood = "idle", 
  showAvatar = true,
  className,
  isStreaming = false
}: LumiMessageProps) => {
  return (
    <div className={cn("flex gap-3 items-start animate-message-appear", className)}>
      {showAvatar && (
        <div className="flex-shrink-0 mt-1">
          <LumiCharacter size="sm" mood={mood} />
        </div>
      )}
      
      <div className="flex-1 space-y-2">
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-2xl rounded-tl-sm px-4 py-3 border border-yellow-200/50 dark:border-yellow-800/50 shadow-sm">
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


