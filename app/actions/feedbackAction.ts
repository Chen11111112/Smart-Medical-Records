"use server";

/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import {
  getHospitalIntegrationDisabledMessage,
  isHospitalIntegrationDisabled,
} from "@/lib/server/demoIntegrationGuard";

export async function submitFeedback(_formData: FormData) {
  if (isHospitalIntegrationDisabled()) {
    return { success: false, message: getHospitalIntegrationDisabledMessage() };
  }
  return { success: false, message: "回饋服務未設定" };
}

export async function submitAiDownvote(_payload: {
  docid: string;
  messageIndex: number;
  aiMessage: string;
}) {
  if (isHospitalIntegrationDisabled()) {
    return { success: false, message: getHospitalIntegrationDisabledMessage() };
  }
  return { success: false, message: "回饋服務未設定" };
}
