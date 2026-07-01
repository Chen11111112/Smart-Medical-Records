/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getErMedicalRecord,
  parseCriteriaInput,
  upsertErMedicalRecord,
} from "@/lib/server/erMedicalRecord";

const withCors = (req: NextRequest, res: NextResponse) => {
  void req;
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
};

async function parseCriteriaFromRequest(
  req: NextRequest
): Promise<Record<string, unknown> | null> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return null;

    if (body.criteria !== undefined) {
      return parseCriteriaInput(body.criteria);
    }
    return body;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData().catch(() => null);
      if (!formData) return null;
      const criteria = formData.get("criteria");
      return parseCriteriaInput(criteria);
    }

    const raw = await req.text();
    const params = new URLSearchParams(raw);
    const criteria = params.get("criteria");
    return parseCriteriaInput(criteria);
  }

  const raw = await req.text();
  if (!raw.trim()) return null;

  try {
    const maybeJson = JSON.parse(raw) as Record<string, unknown>;
    if (maybeJson.criteria !== undefined) {
      return parseCriteriaInput(maybeJson.criteria);
    }
    return maybeJson;
  } catch {
    const params = new URLSearchParams(raw);
    const criteria = params.get("criteria");
    return parseCriteriaInput(criteria);
  }
}

export async function OPTIONS(req: NextRequest) {
  return withCors(req, new NextResponse(null, { status: 204 }));
}

/**
 * POST /api/er-medical-record
 * 院方傳入急診病歷資料（依 20260617 文件規格）
 * Body: { "criteria": { erdhist, ercaseno, ersdinpn, ... } }
 * 或 application/x-www-form-urlencoded: criteria=<JSON字串>
 */
export async function POST(req: NextRequest) {
  try {
    const criteria = await parseCriteriaFromRequest(req);

    if (!criteria) {
      return withCors(
        req,
        NextResponse.json(
          { success: false, error: "缺少 criteria 參數或格式錯誤" },
          { status: 400 }
        )
      );
    }

    const saved = await upsertErMedicalRecord(criteria);

    return withCors(
      req,
      NextResponse.json({
        success: true,
        message: "病歷資料已接收並儲存",
        data: saved,
      })
    );
  } catch (error) {
    console.error("[er-medical-record API] 錯誤:", error);
    const message = error instanceof Error ? error.message : "伺服器錯誤";
    return withCors(
      req,
      NextResponse.json({ success: false, error: message }, { status: 500 })
    );
  }
}

/**
 * GET /api/er-medical-record?erdhist=...&ercaseno=...
 * 查詢本地已儲存的急診病歷
 */
export async function GET(req: NextRequest) {
  try {
    const erdhist = req.nextUrl.searchParams.get("erdhist")?.trim() || "";
    const ercaseno = req.nextUrl.searchParams.get("ercaseno")?.trim() || "";

    if (!erdhist || !ercaseno) {
      return withCors(
        req,
        NextResponse.json(
          { success: false, error: "缺少 erdhist 或 ercaseno 查詢參數" },
          { status: 400 }
        )
      );
    }

    const record = await getErMedicalRecord(erdhist, ercaseno);

    if (!record) {
      return withCors(
        req,
        NextResponse.json({ success: false, error: "查無病歷資料" }, { status: 404 })
      );
    }

    return withCors(req, NextResponse.json({ success: true, data: record }));
  } catch (error) {
    console.error("[er-medical-record API] GET 錯誤:", error);
    return withCors(
      req,
      NextResponse.json({ success: false, error: "伺服器錯誤" }, { status: 500 })
    );
  }
}
