export const TOCC_KEYS = ["T", "O", "C1", "C2"] as const;
export const TOCC_LABELS = ["T", "O", "C", "C"] as const;

export type ToccKey = (typeof TOCC_KEYS)[number];
export type ToccNotes = Partial<Record<ToccKey, string>>;

const TOCC_LINE_RE = /^([TOC]):\s*(.*)$/i;
/** 後端常見格式：T(-) O(-) C(-) C(-); */
const TOCC_COMPACT_RE = /([TOC])\s*\(\s*([+\-])\s*\)/gi;

function extractCompactTocc(text: string): {
  remainder: string;
  statuses: Partial<ToccStatuses>;
} {
  const statuses: Partial<ToccStatuses> = {};
  let cCount = 0;

  const remainder = text.replace(TOCC_COMPACT_RE, (_match, letter: string, sign: string) => {
    const L = letter.toUpperCase();
    const status = sign === "+" ? 1 : 2;
    if (L === "T") {
      statuses.T = status;
    } else if (L === "O") {
      statuses.O = status;
    } else if (L === "C") {
      cCount += 1;
      const key: ToccKey = cCount === 1 ? "C1" : "C2";
      statuses[key] = status;
    }
    return "";
  });

  return { remainder, statuses };
}

/** 從 pastHistory 文字中拆出一般病史與 TOCC 各項內容、按鈕狀態 */
export function parsePastHistoryForTocc(pastHistory: string): {
  generalText: string;
  toccNotes: ToccNotes;
  toccStatuses: Partial<ToccStatuses>;
} {
  const { remainder, statuses: toccStatuses } = extractCompactTocc(pastHistory);
  const lines = remainder.split(/\r?\n/);
  const generalLines: string[] = [];
  const toccNotes: ToccNotes = {};
  let cCount = 0;

  for (const line of lines) {
    const trimmed = line.trim().replace(/^[;；\s]+|[;；\s]+$/g, "");
    if (!trimmed) continue;

    const match = trimmed.match(TOCC_LINE_RE);
    if (match) {
      const letter = match[1].toUpperCase();
      const content = match[2].trim();
      if (letter === "T") {
        toccNotes.T = content;
      } else if (letter === "O") {
        toccNotes.O = content;
      } else if (letter === "C") {
        cCount += 1;
        const key: ToccKey = cCount === 1 ? "C1" : "C2";
        toccNotes[key] = content;
      }
      continue;
    }

    generalLines.push(line);
  }

  return {
    generalText: generalLines.join("\n").trim(),
    toccNotes,
    toccStatuses,
  };
}

export function mergeToccStatuses(
  base: ToccStatuses,
  incoming: Partial<ToccStatuses>
): ToccStatuses {
  const merged = { ...base };
  for (const key of TOCC_KEYS) {
    const value = incoming[key];
    if (value === 1 || value === 2) {
      merged[key] = value;
    }
  }
  return merged;
}

export function mergeToccNote(existing: string | undefined, incoming: string): string {
  const prev = (existing ?? "").trim();
  const next = incoming.trim();
  if (!next) return prev;
  if (!prev) return next;
  if (prev === next || prev.includes(next)) return prev;
  return `${prev} ${next}`;
}

export function mergeToccNotes(
  base: ToccNotes,
  incoming: ToccNotes
): ToccNotes {
  const merged: ToccNotes = { ...base };
  for (const key of TOCC_KEYS) {
    const value = incoming[key]?.trim();
    if (value) {
      merged[key] = mergeToccNote(merged[key], value);
    }
  }
  return merged;
}

export type ToccStatuses = Record<ToccKey, number>;

export const INITIAL_TOCC_STATUSES: ToccStatuses = {
  T: 0,
  O: 0,
  C1: 0,
  C2: 0,
};

/** 依 T → O → C → C 順序組合模板 TOCC 與按鈕狀態文字 */
export function buildToccDisplayText(
  statuses: ToccStatuses,
  templateNotes: ToccNotes
): string {
  return TOCC_KEYS.map((key, index) => {
    const label = TOCC_LABELS[index];
    const parts: string[] = [];

    const note = templateNotes[key]?.trim();
    if (note) {
      parts.push(`${label}: ${note}`);
    }

    const status = statuses[key] ?? 0;
    if (status === 1) {
      parts.push(`${label}: +`);
    } else if (status === 2) {
      parts.push(`${label}: -`);
    }

    return parts.join("");
  })
    .filter(Boolean)
    .join("");
}
