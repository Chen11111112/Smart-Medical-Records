"use server";

/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import { getDemoAiOutput } from "@/lib/server/demoFakeData";
import type { AITriggerType } from "@/lib/utils/aiFormatters";

export type AiCallMeta = {
  docid?: string;
  histno?: string;
  caseno?: string;
  featureType?: AITriggerType;
  sourceMode?: string;
};

export type AiResponseResult = {
  success: boolean;
  output?: unknown;
  message?: string;
};

export async function generateAIResponse(
  message: string,
  prompt: string,
  meta?: AiCallMeta
): Promise<AiResponseResult> {
  void message;

  if (!message || !message.trim()) {
    throw new Error("Content 不可為空");
  }

  const output = getDemoAiOutput(meta?.featureType ?? "", prompt);
  return { success: true, output };
}
