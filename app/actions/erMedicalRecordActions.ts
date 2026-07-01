"use server";

/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import { getErMedicalRecord, type ErMedicalRecordPayload } from "@/lib/server/erMedicalRecord";

export async function getErMedicalRecordAction(
  erdhist: string,
  ercaseno: string
): Promise<{ success: true; data: ErMedicalRecordPayload } | { success: false; error: string }> {
  try {
    const data = await getErMedicalRecord(erdhist, ercaseno);
    if (!data) {
      return { success: false, error: "查無本地病歷資料" };
    }
    return { success: true, data };
  } catch (error) {
    console.error("[getErMedicalRecordAction] 錯誤:", error);
    return { success: false, error: "查詢本地病歷失敗" };
  }
}
