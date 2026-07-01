/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import { NextRequest, NextResponse } from "next/server";
import { getWhisperDisabledMessage, isWhisperDisabled } from "@/lib/server/demoIntegrationGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (isWhisperDisabled()) {
    return NextResponse.json(
      { detail: getWhisperDisabledMessage() },
      { status: 503 }
    );
  }

  void request;
  return NextResponse.json({ detail: "轉錄服務未設定" }, { status: 503 });
}
