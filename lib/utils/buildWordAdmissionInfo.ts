export interface WordAdmissionMeta {
  住院號: string;
  住院科別: string;
  住院日期: string;
  住院時間: string;
  職業: string;
  血型RH: string;
  婚姻狀況: string;
  身分: string;
  問診日期: string;
  問診時間: string;
  轉診醫院: string;
  抽煙習慣: string;
  二手菸暴露風險: string;
}

const NA = "N/A";

function isBlank(v: unknown): boolean {
  const s = String(v ?? "").trim();
  return !s || s === "None" || s === "none" || s === "undefined";
}

function pickVal(...vals: unknown[]): string {
  for (const v of vals) {
    if (!isBlank(v)) return String(v).trim();
  }
  return NA;
}

function formatYyyymmdd(val: unknown): string | null {
  if (isBlank(val)) return null;
  const digits = String(val).replace(/\D/g, "");
  if (digits.length >= 8) return digits.slice(0, 8);
  return null;
}

function pickDate(...vals: unknown[]): string {
  for (const v of vals) {
    const formatted = formatYyyymmdd(v);
    if (formatted) return formatted;
  }
  return NA;
}

function formatHhmm(val: unknown): string | null {
  if (isBlank(val)) return null;
  const s = String(val).trim();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return `${String(Number(m[1])).padStart(2, "0")}:${m[2]}`;
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 4) {
    const tail = digits.slice(-4);
    return `${tail.slice(0, 2)}:${tail.slice(2)}`;
  }
  return null;
}

function pickTime(...vals: unknown[]): string {
  for (const v of vals) {
    const formatted = formatHhmm(v);
    if (formatted) return formatted;
  }
  return NA;
}

export function buildWordAdmissionMeta(
  session: Record<string, unknown> | null | undefined
): WordAdmissionMeta {
  if (!session) {
    return {
      住院號: NA,
      住院科別: NA,
      住院日期: NA,
      住院時間: NA,
      職業: NA,
      血型RH: NA,
      婚姻狀況: NA,
      身分: NA,
      問診日期: NA,
      問診時間: NA,
      轉診醫院: NA,
      抽煙習慣: NA,
      二手菸暴露風險: "No",
    };
  }

  return {
    住院號: pickVal(
      session["住院號"],
      session["就診號"],
      session["病歷號"]
    ),
    住院科別: pickVal(
      session["住院科別"],
      session["最後就診科別"],
      session["初診科別"]
    ),
    住院日期: pickDate(
      session["住院日期"],
      session["最後就診日期"],
      session["初診日期"],
      session["資料異動日期"]
    ),
    住院時間: pickTime(session["住院時間"], session["最後就診日期"]),
    職業: pickVal(session["職業"]),
    血型RH: pickVal(session["血型RH"], session["血型"]),
    婚姻狀況: pickVal(session["婚姻狀況"]),
    身分: pickVal(session["身分"], session["病患身分身份別"]),
    問診日期: pickDate(
      session["問診日期"],
      session["初診日期"],
      session["最後就診日期"]
    ),
    問診時間: pickTime(
      session["問診時間"],
      session["初診日期"],
      session["最後就診日期"]
    ),
    轉診醫院: pickVal(session["轉診醫院"]),
    抽煙習慣: pickVal(session["抽煙習慣"]),
    二手菸暴露風險: pickVal(session["二手菸暴露風險"]) === NA
      ? "No"
      : pickVal(session["二手菸暴露風險"]),
  };
}
