/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import { assertWhisperEnabled, getWhisperDisabledMessage, isWhisperDisabled } from "@/lib/server/demoIntegrationGuard";

export type VghChatRole = "system" | "user" | "assistant";

export type VghChatMessage = {
  role: VghChatRole;
  content: string;
};

export async function vghChatCompletion(
  _messages: VghChatMessage[],
  _temperature = 0
): Promise<string> {
  if (isWhisperDisabled()) {
    assertWhisperEnabled("Whisper SOAP 摘要");
  }
  return "";
}
