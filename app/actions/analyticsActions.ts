"use server";

/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import type { AITriggerType } from "@/lib/utils/aiFormatters";
import type {
  AiUsageLogInput,
  AiResponseLogInput,
  WhisperInputType,
  WhisperUsageLogInput,
} from "@/lib/server/analyticsDb";

export async function logAiFeatureUsage(_input: AiUsageLogInput) {
  return { success: true };
}

export async function logWhisperUsageAction(_input: WhisperUsageLogInput) {
  return { success: true };
}

export async function logAiResponseAction(_input: AiResponseLogInput) {
  return { success: true };
}

export async function getAnalyticsSummaryAction() {
  return {
    success: true as const,
    aiFeatureStats: [],
    whisperStats: [],
    whisperRecord: 0,
    whisperUpload: 0,
    whisperTotal: 0,
    whisperRecordRatio: 0,
    whisperUploadRatio: 0,
    aiByDoctor: [],
    responseLogTotal: 0,
  };
}

export type { AITriggerType, WhisperInputType };
