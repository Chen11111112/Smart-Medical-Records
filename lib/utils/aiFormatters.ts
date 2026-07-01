import { extractIcdCodeFromText } from '@/lib/utils/extractIcdCode';

export type AITriggerType = 'HistorySP' | 'CurrAsse' | 'Admission' | 'chiefComplaint' | 'icd';

export interface AIItemOption {
  id: string;
  text: string;
  checked: boolean;
}

export interface AIItem {
  id: string;
  groupLabel: string;
  options: AIItemOption[];
}

export const triggerDisplayMap: Record<AITriggerType, string> = {
  HistorySP: '歷程記錄AI摘要',
  CurrAsse: '本次病況AI診斷推論',
  Admission: '轉住院AI生成病歷',
  chiefComplaint: '主敘AI推論',
  icd: 'ICD-10 診斷建議'
};

export const stripListIndexPrefix = (text: string): string =>
  String(text).trim().replace(/^-/, '').replace(/^\d+\.\s*/, '');

/** 畫面顯示：小寫 icd / icd10 統一為 ICD / ICD10 */
export const normalizeIcdDisplayText = (text: string): string =>
  text
    .replace(/icd-10/gi, 'ICD-10')
    .replace(/icd10/gi, 'ICD10')
    .replace(/\bicd\b/gi, 'ICD');

const normalizeText = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) {
    return val.map(item => stripListIndexPrefix(String(item))).join('\n');
  }
  if (typeof val === 'object') {
    return Object.entries(val as object)
      .map(([k, v]) => `${k}: ${normalizeText(v)}`)
      .join('\n');
  }
  return String(val).trim();
};

const getFilteredEntries = (data: any) => {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data).filter(([_, val]) => {
    if (val === null || val === undefined || val === '') return false;
    if (Array.isArray(val)) return val.length > 0;
    return true;
  });
};

const splitToDashLines = (value: unknown) =>
  normalizeText(value)
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => String(s).trim().replace(/^-/, ''));

const formatHistoryItems = (data: any): AIItem[] => {
  const entries = getFilteredEntries(data);
  return entries.map(([key, val], groupIdx) => {
    const options = Array.isArray(val)
      ? val.map((item, optionIdx) => ({
          id: `history-${groupIdx}-${optionIdx}`,
          text: String(item).trim(),
          checked: false
        }))
      : [{
          id: `history-${groupIdx}-plain`,
          text: String(val).trim(),
          checked: false
        }];

    return {
      id: `history-group-${groupIdx}`,
      groupLabel: key,
      options
    };
  });
};

const formatAdmissionItems = (data: any): AIItem[] =>
  getFilteredEntries(data).map(([key, val]) => {
    const lines = splitToDashLines(val);
    return {
      id: `admission-${key}`,
      groupLabel: `${key}`,
      options: lines.map((line, idx) => ({
        id: `admission-${key}-${idx}`,
        text: line,
        checked: false
      }))
    };
  });

const formatChiefComplaintItems = (data: any): AIItem[] => {

  // if (typeof data === 'string') {
  //   const cleanText = data.replace(/[\[\]]/g, '');
    
  //   return [ {
  //     id: `chief-${1}`,
  //     groupLabel:"",
  //     options:[
  //         {
  //           id: `chief-1-0`,
  //           text: cleanText,
  //           checked: false
  //         }
  //       ],

  //   }]
  // };
    
  if (data && typeof data === 'object') {
    return Object.entries(data).map(([key, val], idx) => {
      const lines = Array.isArray(val)
        ? val.map((item) => stripListIndexPrefix(String(item)))
        : ['AI回傳格式錯誤，請重新嘗試'];
      return {
        id: `chief-${idx}`,
        groupLabel: key,
        options: lines.map((line: string, optionIdx: number) => ({
          id: `chief-${idx}-${optionIdx}`,
          text: line,
          checked: false
        }))
      };
    });
  }

  return [{
    id: 'chief-plain',
    groupLabel: '',
    options: [{
      id: 'chief-plain-0',
      text: normalizeText(data),
      checked: false
    }]
  }];
};

const dedupeIcdItems = (items: AIItem[]): AIItem[] => {
  const seenCodes = new Set<string>();
  const seenTexts = new Set<string>();

  return items
    .map((group) => ({
      ...group,
      options: group.options.filter((opt) => {
        const text = opt.text.trim();
        if (!text) return false;

        const code = extractIcdCodeFromText(text);
        if (code) {
          if (seenCodes.has(code)) return false;
          seenCodes.add(code);
          return true;
        }

        const key = text.toLowerCase();
        if (seenTexts.has(key)) return false;
        seenTexts.add(key);
        return true;
      }),
    }))
    .filter((group) => group.options.length > 0);
};

const formatIcdItems = (data: any): AIItem[] => {
  const rootData = data['Diagnosis with ICD code'] || data;

  if (typeof rootData !== 'object' || rootData === null) {
    return dedupeIcdItems([
      {
        id: 'fallback',
        groupLabel: 'ICD10 建議',
        options: [{ id: '1', text: normalizeText(rootData), checked: false }],
      },
    ]);
  }

  const items = Object.entries(rootData).map(([key, val], idx) => ({
    id: `icd-group-${idx}`,
    groupLabel: normalizeIcdDisplayText(key),
    options: Array.isArray(val)
      ? val.map((item, subIdx) => ({
          id: `icd-${idx}-${subIdx}`,
          text: String(item).replace(/^\d+\.\s*/, ''),
          checked: false,
        }))
      : [{ id: `icd-${idx}-plain`, text: normalizeText(val), checked: false }],
  }));

  return dedupeIcdItems(items);
};

export const formatItemsByTrigger = (triggerType: AITriggerType, data: any): AIItem[] => {
  const formatterMap: Record<AITriggerType, (payload: any) => AIItem[]> = {
    HistorySP: formatHistoryItems,
    CurrAsse: formatChiefComplaintItems,
    Admission: formatAdmissionItems,
    chiefComplaint: formatChiefComplaintItems,
    icd: formatIcdItems
  };
  return formatterMap[triggerType](data);
};

const tryParseJson = (text: string): unknown | null => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/** 解析 AI 回傳字串（純 JSON、markdown code block、或內嵌 JSON） */
export const parseAiResponseText = (raw: string): unknown => {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const direct = tryParseJson(trimmed);
  if (direct !== null) return direct;

  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock?.[1]) {
    const fromBlock = tryParseJson(codeBlock[1].trim());
    if (fromBlock !== null) return fromBlock;
  }

  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const fromObj = tryParseJson(objMatch[0]);
    if (fromObj !== null) return fromObj;
  }

  const arrMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    const fromArr = tryParseJson(arrMatch[0]);
    if (fromArr !== null) return fromArr;
  }

  return trimmed;
};

/** 將自由對話 AI 回覆格式化為可勾選項目 */
export const formatChatItems = (data: unknown): AIItem[] => {
  if (data === null || data === undefined || data === "") return [];

  if (typeof data === "string") {
    const reparsed = parseAiResponseText(data);
    if (reparsed !== data) return formatChatItems(reparsed);

    const lines = data
      .split("\n")
      .map((line) => stripListIndexPrefix(line.trim()))
      .filter(Boolean);

    if (lines.length > 1) {
      return [
        {
          id: "chat-lines",
          groupLabel: "",
          options: lines.map((line, idx) => ({
            id: `chat-line-${idx}`,
            text: line,
            checked: false,
          })),
        },
      ];
    }

    const text = normalizeText(data);
    if (!text) return [];
    return [
      {
        id: "chat-plain",
        groupLabel: "",
        options: [{ id: "chat-plain-0", text, checked: false }],
      },
    ];
  }

  if (Array.isArray(data)) {
    const options = data
      .map((item, idx) => ({
        id: `chat-arr-${idx}`,
        text: normalizeText(item),
        checked: false,
      }))
      .filter((opt) => opt.text);
    return options.length
      ? [{ id: "chat-array", groupLabel: "", options }]
      : [];
  }

  if (typeof data === "object") {
    const entries = getFilteredEntries(data);
    if (entries.length === 0) return [];
    return formatHistoryItems(data);
  }

  const text = normalizeText(data);
  return text
    ? [
        {
          id: "chat-scalar",
          groupLabel: "",
          options: [{ id: "chat-scalar-0", text, checked: false }],
        },
      ]
    : [];
};
