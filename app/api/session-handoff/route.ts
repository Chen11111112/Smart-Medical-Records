/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import { NextRequest, NextResponse } from "next/server";
import {
  PATIENT_SESSION_HANDOFF_API_QUERY_KEY,
  PATIENT_SESSION_HANDOFF_COOKIE,
} from "@/lib/constants/patientSession";
import {
  clearPatientSessionHandoffCookie,
  resolveHandoffFromTokens,
} from "@/lib/server/patientSessionHandoff";
import { resolvePatientSession } from "@/lib/server/resolvePatientSession";

const noStore = (res: NextResponse) => {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
};

/**
 * GET /api/session-handoff
 * 從 URL 參數 hs 或 Cookie 領取本次病患 session（院方 POST + window.open 流程）。
 */
export async function GET(req: NextRequest) {
  const urlToken = req.nextUrl.searchParams.get(PATIENT_SESSION_HANDOFF_API_QUERY_KEY) ?? "";
  const cookieToken = req.cookies.get(PATIENT_SESSION_HANDOFF_COOKIE)?.value ?? "";
  const handoff = await resolveHandoffFromTokens(urlToken, cookieToken);

  if (!handoff) {
    return noStore(
      NextResponse.json(
        {
          success: false,
          error:
            "無可用的 session handoff（可能已過期，請由急診系統重新開啟）",
        },
        { status: 404 }
      )
    );
  }

  const resolved = await resolvePatientSession(handoff.criteria);
  if (!resolved.ok) {
    return noStore(
      NextResponse.json(
        { success: false, error: resolved.error },
        { status: resolved.status }
      )
    );
  }

  const res = NextResponse.json({
    success: true,
    patientData: resolved.patientData,
    returnUrl: handoff.returnUrl || null,
  });

  return noStore(clearPatientSessionHandoffCookie(res));
}
