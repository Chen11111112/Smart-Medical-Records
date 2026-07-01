import { formatTaiwanToADDate } from "./formatADDate";

/** 將各種日期字串轉為 yyyy/m/d */
export function formatSlashDate(dateStr: string): string {
  if (!dateStr) return "";

  const raw = dateStr.split("|")[0].trim();

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}/${Number(iso[2])}/${Number(iso[3])}`;
  }

  const spaced = raw.match(/(\d{4})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (spaced) {
    return `${spaced[1]}/${Number(spaced[2])}/${Number(spaced[3])}`;
  }

  const clean = raw.replace(/\D/g, "");
  if (clean.length >= 8) {
    return `${clean.slice(0, 4)}/${Number(clean.slice(4, 6))}/${Number(clean.slice(6, 8))}`;
  }

  return raw;
}

export function stripAmPm(text: string): string {
  if (!text) return "";

  return text.replace(/([-\uFF0D~]?(上午|下午))/g, "").trim();
}

/** 手術紀錄：yyyy/m/d 術式一 */
export function buildSurgeryTitle(item: Record<string, unknown>): string {
  const dateRaw = item["手術日期"] ?? item["日期"] ?? "";
  const date = formatTaiwanToADDate(String(dateRaw));
  const procedure = String(item["術式一"] ?? "").trim();
  return procedure ? `${date} ${procedure}` : date;
}

/** 門診紀錄：yyyy/m/d 次專科名（去掉上午/下午） */
export function buildOutpatientTitle(item: Record<string, unknown>): string {
  const dateRaw = item["門診日期"] ?? item["日期"] ?? "";
  const date = formatSlashDate(String(dateRaw));
  const specialty = stripAmPm(String(item["次專科名"] ?? ""));
  return specialty ? `${date} ${specialty}` : date;
}

/** 從聚合後的「日期」欄位解析入院/出院日期（格式：yyyy-mm-dd | yyyy-mm-dd） */
function parseCombinedDates(dateStr: string): { admission: string; discharge: string } {
  const parts = dateStr.split("|").map((s) => s.trim()).filter(Boolean);
  return { admission: parts[0] ?? "", discharge: parts[1] ?? "" };
}

/** 出入院日期科別：yyyy/m/d【入院科別】-yyyy/m/d【出院科別】 */
export function buildDischargeTitle(item: Record<string, unknown>): string {
  const combined = parseCombinedDates(String(item["日期"] ?? ""));
  const admissionDate = formatSlashDate(
    String(item["住院日期"] ?? combined.admission)
  );
  const admissionDept = String(item["入院科別"] ?? "").trim();
  const dischargeDate = formatSlashDate(
    String(item["出院日期"] ?? combined.discharge)
  );
  const dischargeDept = String(item["出院科別"] ?? "").trim();

  const formatPart = (date: string, dept: string) => {
    if (!date && !dept) return "";
    if (date && dept) return `${date}【${dept}】`;
    if (date) return date;
    return `【${dept}】`;
  };

  const admission = formatPart(admissionDate, admissionDept);
  const discharge = formatPart(dischargeDate, dischargeDept);

  if (admission && discharge) return `${admission}-  ${discharge}`;
  return admission || discharge;
}

/** 其他紀錄：僅 yyyy/m/d */
export function buildDateOnlyTitle(item: Record<string, unknown>): string {
  const dateRaw =
    item["日期"] ??
    item["報告時間"] ??
    item["住院日期"] ??
    item["出院日期"] ??
    "";
  return formatSlashDate(String(dateRaw));
}
