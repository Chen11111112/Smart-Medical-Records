"use server";

/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import { getDemoVitalSigns } from "@/lib/server/demoFakeData";

type VitalSignsData = {
  bp_s: string;
  bp_d: string;
  pr: string;
  rr: string;
  bt: string;
  bw: string;
  疼痛評估: string;
};

type VitalSignsResult =
  | { success: true; data: VitalSignsData }
  | { success: false; error: string };

/**
 * @VitalSigns
 */
export async function getVitalSigns(
  _histno: string,
  _caseno: string
): Promise<VitalSignsResult> {
  return getDemoVitalSigns() as VitalSignsResult;
}
