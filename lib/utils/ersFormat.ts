/** 依 docs/ERS-20260615-儲存暫存病歷API-v3.pdf */

const raw = (value: unknown) => String(value ?? "");

export function normalizeErdhist(value: unknown): string {
  const trimmed = raw(value).trim();
  if (!trimmed) return "";
  if (/^\d+$/.test(trimmed)) {
    return trimmed.padStart(10, "0").slice(0, 10);
  }
  return trimmed.slice(0, 10);
}

/** PDF 範例：「 I4445584」= 前導空白 + 就診序號 8 碼 */
export function normalizeErcaseno(value: unknown): string {
  const compact = raw(value).replace(/\s+/g, "");
  if (!compact) return "";
  const core = compact.slice(-8);
  return ` ${core}`.slice(0, 12);
}

export function displayErcaseno(value: unknown): string {
  return raw(value).trim();
}

export function normalizeErsdinpn(value: unknown): string {
  return raw(value).trim().toUpperCase().slice(0, 8);
}

export const ERS_VALIDATION_FAIL_MSG =
  "找不到病患就診資料或醫師燈號錯誤，故無法匯入。";

export function formatErsSaveError(ret: number | string | undefined, retmsg?: string) {
  const msg = retmsg?.trim() || "資料儲存失敗";
  if (Number(ret) !== 0 && msg.includes("找不到病患就診資料")) {
    return `${msg}（驗證失敗：ERSBROOT 無此就診資料，或 VUPROOT 醫師燈號無效，請確認病歷號、就診序號後 8 碼、醫師 ID）`;
  }
  if (Number(ret) !== 0 && msg.includes("缺少必要參數")) {
    return `${msg}（erdhist、ercaseno、ersdinpn 為必填）`;
  }
  if (Number(ret) !== 0 && msg.includes("不符合格式")) {
    return `${msg}（請確認各欄位長度限制）`;
  }
  return msg;
}
