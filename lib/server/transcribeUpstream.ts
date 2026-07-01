/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import { getWhisperDisabledMessage, isWhisperDisabled } from "@/lib/server/demoIntegrationGuard";

export async function transcribeUpstream(
  _file: Blob,
  _targetApi: string,
  _sessionId: string
): Promise<{ text?: string; log?: string }> {
  if (isWhisperDisabled()) {
    return { log: getWhisperDisabledMessage() };
  }
  return { log: "轉錄服務未設定" };
}
