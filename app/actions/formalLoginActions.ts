"use server";

/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import { getDemoPatientSession } from "@/lib/server/demoFakeData";

export async function submitMedicalData(formData: FormData) {
  const histno = formData.get("histno")?.toString().trim();
  const caseno = formData.get("caseno")?.toString().trim();
  const docid = formData.get("docid")?.toString().trim();

  if (!histno) {
    throw new Error("請輸入病歷號");
  }
  if (!caseno) {
    throw new Error("請輸入就診號");
  }
  if (!docid) {
    throw new Error("請輸入醫師 ID");
  }

  return {
    patientData: getDemoPatientSession({
      病歷號: histno,
      就診號: caseno,
      醫生ID: docid,
    }),
  };
}
