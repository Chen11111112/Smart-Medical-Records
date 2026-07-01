import React from "react";
import styles from "@/styles/components/AI.module.scss";

// 比對從 `[#Warning` 開頭直到遇到第一個 `]` 的整段警告文字
const WARNING_PATTERN = /\[#Warning.*?\]/gi;

function renderBoldSegment(text: string, keyPrefix: string): React.ReactNode {
  const regex = /\*\*(.+?)\*\*/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={`${keyPrefix}-b${key++}`}>{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) return text;
  if (parts.length === 1) return parts[0];
  return <>{parts}</>;
}

/** 將 `**粗體**` 轉為 <strong>，以 `[#Warning` 開頭直到 `]` 的整段轉為紅色高亮 */
export function renderAiBoldText(text: string): React.ReactNode {
  // 若沒有任何 Warning 標記，就只處理粗體
  if (!text.match(WARNING_PATTERN)) {
    return renderBoldSegment(text, "root");
  }

  // 每次執行前重置搜尋位置
  WARNING_PATTERN.lastIndex = 0;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = WARNING_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderBoldSegment(text.slice(lastIndex, match.index), `s${key}`));
    }
    parts.push(
      <span key={`w${key++}`} className={styles.aiWarning}>
        {match[0]}
      </span>
    );
    lastIndex = WARNING_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(renderBoldSegment(text.slice(lastIndex), `s${key}`));
  }

  if (parts.length === 0) return text;
  if (parts.length === 1) return parts[0];
  return <>{parts}</>;
}
