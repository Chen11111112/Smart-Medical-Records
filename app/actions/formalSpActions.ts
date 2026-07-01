"use server";

/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import type { SpPayload } from "@/lib/data/spData";
import { getDemoSpHistory } from "@/lib/server/demoFakeData";

type SpHistoryResult =
  | { success: true; data: SpPayload }
  | { success: false; error: string };

export async function getProcedureData(
  _histno: string,
  _docid: string
): Promise<SpHistoryResult | { error: string }> {
  const result = getDemoSpHistory();
  return {
    success: true,
    data: result.data as unknown as SpPayload,
  };
}
