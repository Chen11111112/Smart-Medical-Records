/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import { NextRequest, NextResponse } from "next/server";
import { ERS_RETURN_URL_SS_KEY, ERS_OPENED_AS_POPUP_SS_KEY } from "@/lib/constants/patientSession";
import { parseExternalSessionRequest } from "@/lib/server/externalSessionCriteria";
import { attachPatientSessionHandoffCookie, buildHandoffRedirectPath } from "@/lib/server/patientSessionHandoff";
import { resolvePatientSession } from "@/lib/server/resolvePatientSession";
import { isErsUrl, normalizeReturnUrl } from "@/lib/utils/ersReturnUrl";

const wantsHtmlResponse = (req: NextRequest) => {
  const accept = req.headers.get("accept") || "";
  const fetchDest = req.headers.get("sec-fetch-dest") || "";
  return accept.includes("text/html") || fetchDest === "document";
};

const buildAutoRedirectHtml = (redirectPath: string) => {
  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting...</title>
  </head>
  <body>
    <script>
      sessionStorage.setItem(${JSON.stringify(ERS_OPENED_AS_POPUP_SS_KEY)}, "1");
      const referrer = document.referrer || "";
      if (referrer) {
        sessionStorage.setItem(
          ${JSON.stringify(ERS_RETURN_URL_SS_KEY)},
          referrer
        );
      }
      window.location.replace(${JSON.stringify(redirectPath)});
    </script>
  </body>
</html>`;
};

const resolveHandoffReturnUrl = (req: NextRequest) => {
  const referer = normalizeReturnUrl(req.headers.get("referer"));
  if (referer && isErsUrl(referer)) {
    return referer;
  }
  return "";
};

const withCors = (req: NextRequest, res: NextResponse) => {
  void req;
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
};

export async function OPTIONS(req: NextRequest) {
  return withCors(req, new NextResponse(null, { status: 204 }));
}

/**
 * POST /api/external-session
 *
 * 支援院方整合（見 docs/open_mysys.js）：
 * 1. 完整 criteria：histno, caseno, docid + vitals + medicalInfo（含主述、理學、ICD）
 * 2. 精簡格式：僅 histno, caseno, docid（可 flat 或包在 criteria 內）
 * 3. ERS 扁平欄位：erdia01、erdib01、erdta03 等（可與巢狀欄位並存）
 *
 * 院方流程：$.ajax POST → success 後 window.open(smarters + redirectUrl)
 */
export async function POST(req: NextRequest) {
  try {
    const criteria = await parseExternalSessionRequest(req);

    if (!criteria) {
      return withCors(
        req,
        NextResponse.json(
          {
            success: false,
            error: "缺少 criteria 或必要欄位 histno, caseno, docid",
          },
          { status: 400 }
        )
      );
    }

    const resolved = await resolvePatientSession(criteria);
    if (!resolved.ok) {
      return withCors(
        req,
        NextResponse.json(
          {
            success: false,
            error: resolved.error,
          },
          { status: resolved.status }
        )
      );
    }

    const { patientData } = resolved;
    const returnUrl = resolveHandoffReturnUrl(req);
    const redirectPath = await buildHandoffRedirectPath(criteria, returnUrl);

    if (wantsHtmlResponse(req)) {
      return withCors(
        req,
        await attachPatientSessionHandoffCookie(
          new NextResponse(buildAutoRedirectHtml(redirectPath), {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          }),
          criteria,
          returnUrl
        )
      );
    }

    return withCors(
      req,
      await attachPatientSessionHandoffCookie(
        NextResponse.json(
          {
            success: true,
            patientData,
            redirectUrl: redirectPath,
          },
          {
            status: 200,
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
          }
        ),
        criteria,
        returnUrl
      )
    );
  } catch (error) {
    console.error("Unexpected error in external-session route:", error);
    return withCors(
      req,
      NextResponse.json(
        {
          success: false,
          error: "伺服器錯誤，請稍後再試",
        },
        { status: 500 }
      )
    );
  }
}
