"use server";

/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import {
  formatChatItems,
  parseAiResponseText,
  type AIItem,
} from "@/lib/utils/aiFormatters";
import { getDemoAiOutput } from "@/lib/server/demoFakeData";

type AiChatResult = {
  text: string;
  success: boolean;
  items?: AIItem[];
};

export async function chatWithAiAction(
  message: string,
  _prompt?: string
): Promise<AiChatResult> {
  const normalizedMessage = message?.trim();
  if (!normalizedMessage) {
    throw new Error("Content 不可為空");
  }

  const rawOutput = getDemoAiOutput("chiefComplaint");
  const parsed = parseAiResponseText(JSON.stringify(rawOutput));
  const items = formatChatItems(parsed);

  if (items.length > 0) {
    return { success: true, text: "", items };
  }

  return { success: true, text: JSON.stringify(rawOutput) };
}
