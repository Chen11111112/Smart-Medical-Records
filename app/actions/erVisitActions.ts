"use server";

/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import type { ErVisitLookup } from "@/lib/server/ersIdentifiers";
import { resolveErVisit } from "@/lib/server/resolveErVisit";

export async function resolveErVisitAction(
  histno: string,
  caseno: string
): Promise<ErVisitLookup> {
  return resolveErVisit(histno, caseno);
}
