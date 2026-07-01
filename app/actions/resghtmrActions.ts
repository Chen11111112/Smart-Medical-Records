"use server";

/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import {
  getHospitalIntegrationDisabledMessage,
  isHospitalIntegrationDisabled,
} from "@/lib/server/demoIntegrationGuard";

interface ErsParams {
  partno: string;
  histno: string;
  seqcn: string;
  seqno: string;
  reqno: string;
  signid: string;
}

export async function fetchErsReport(_params: ErsParams): Promise<string> {
  if (isHospitalIntegrationDisabled()) {
    return getHospitalIntegrationDisabledMessage();
  }
  return "報告服務未設定";
}
