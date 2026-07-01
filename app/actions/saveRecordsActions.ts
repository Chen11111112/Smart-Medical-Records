"use server";

/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import {
  getHospitalIntegrationDisabledMessage,
  isHospitalIntegrationDisabled,
} from "@/lib/server/demoIntegrationGuard";
import { normalizeErMedicalRecord } from "@/lib/server/erMedicalRecord";

export async function saveMedicalRecord(_data: Record<string, unknown>) {
  if (isHospitalIntegrationDisabled()) {
    return { success: false, message: getHospitalIntegrationDisabledMessage() };
  }
  return { success: false, message: "儲存服務未設定" };
}

export async function saveMedicalRecordLocalOnly(data: Record<string, unknown>) {
  if (isHospitalIntegrationDisabled()) {
    return {
      success: false as const,
      message: getHospitalIntegrationDisabledMessage(),
    };
  }
  return {
    success: true as const,
    data: normalizeErMedicalRecord(data),
  };
}
