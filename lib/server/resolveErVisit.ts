/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import type { ErVisitLookup } from "@/lib/server/ersIdentifiers";
import { getDemoErVisit } from "@/lib/server/demoFakeData";

export async function resolveErVisit(
  histno: string,
  caseno: string
): Promise<ErVisitLookup> {
  const trimmedHist = histno.trim();
  const trimmedCase = caseno.trim();

  if (!trimmedHist || !trimmedCase) {
    return { success: false, error: "缺少病歷號或就診號" };
  }

  return getDemoErVisit(trimmedHist, trimmedCase);
}
