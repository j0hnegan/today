import React from "react";

const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

export function linkifyText(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset lastIndex since we reuse the global regex
  URL_PATTERN.lastIndex = 0;

  while ((match = URL_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    result.push(
      <a
        key={match.index}
        href={match[0]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {match[0]}
      </a>
    );
    lastIndex = URL_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : [text];
}
