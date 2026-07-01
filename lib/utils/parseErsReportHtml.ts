import { formatSlashDate } from "@/lib/utils/spRecordTitles";

const NO_REPORT_PHRASES = ["本醫囑尚未發報告", "無報告"];

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** 是否為尚未發報告 / 無報告 */
export function isErsNoReport(html: string): boolean {
  const text = stripTags(html);
  return NO_REPORT_PHRASES.some((phrase) => text.includes(phrase));
}

function extractTableValue(html: string, labelPattern: RegExp): string {
  const match = html.match(
    new RegExp(
      `${labelPattern.source}[\\s\\S]*?<t[dh][^>]*>([\\s\\S]*?)<\\/t[dh]`,
      labelPattern.flags
    )
  );
  if (match?.[1]) {
    return stripTags(match[1]);
  }
  return "";
}

/** 從 ERS HTML 解析報告日期與 Medical order（醫囑名稱） */
export function parseErsReportHtml(html: string): {
  date: string;
  medicalOrder: string;
} | null {
  if (!html?.trim() || isErsNoReport(html)) {
    return null;
  }

  const medicalOrder =
    extractTableValue(html, /Medical\s*order/i) ||
    extractTableValue(html, /醫囑名稱/) ||
    extractTableValue(html, /醫囑名/) ||
    (html.match(/Medical\s*order\s*[:：]\s*([^<\n|]+)/i)?.[1]?.trim() ?? "");

  let dateRaw =
    extractTableValue(html, /報告時間/) ||
    extractTableValue(html, /Report\s*Date/i) ||
    extractTableValue(html, /檢查日期/) ||
    extractTableValue(html, /採檢日期/) ||
    extractTableValue(html, /醫囑日期/) ||
    "";

  if (!dateRaw) {
    const dateInText = stripTags(html).match(
      /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/
    );
    dateRaw = dateInText?.[1] ?? "";
  }

  const date = formatSlashDate(dateRaw);

  if (!date && !medicalOrder) {
    return null;
  }

  return { date, medicalOrder };
}

export function buildErsReportTitle(meta: {
  date: string;
  medicalOrder: string;
}): string {
  return [meta.date, meta.medicalOrder].filter(Boolean).join("\u3000");
}
