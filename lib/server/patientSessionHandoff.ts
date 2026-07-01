import { SignJWT, jwtVerify } from "jose";
import {
  PATIENT_SESSION_HANDOFF_COOKIE,
  PATIENT_SESSION_HANDOFF_QUERY_KEY,
} from "@/lib/constants/patientSession";
import {
  buildExternalSessionCriteriaFromRecord,
  type ExternalSessionCriteria,
} from "@/lib/server/externalSessionCriteria";
import { normalizeReturnUrl } from "@/lib/utils/ersReturnUrl";
import type { NextResponse } from "next/server";

const HANDOFF_TTL_SEC = 10 * 60;

const JWT_META_KEYS = new Set(["exp", "iat", "nbf", "jti", "iss", "aud", "sub"]);

const stripJwtMeta = (record: Record<string, unknown>) => {
  const source: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!JWT_META_KEYS.has(key)) {
      source[key] = value;
    }
  }
  return source;
};

const getHandoffSecret = () => {
  const fromEnv = process.env.SESSION_HANDOFF_SECRET?.trim();
  if (fromEnv) return new TextEncoder().encode(fromEnv);
  return new TextEncoder().encode("emergency-web-handoff-dev-secret");
};

const signJwtPayload = async (payload: Record<string, unknown>) =>
  new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${HANDOFF_TTL_SEC}s`)
    .sign(getHandoffSecret());

/** 完整 criteria（Cookie，含 vitals / medicalInfo） */
export async function signPatientSessionHandoff(
  criteria: ExternalSessionCriteria,
  returnUrl: unknown
): Promise<string> {
  const payload: Record<string, unknown> = {
    ...criteria,
    ...(normalizeReturnUrl(returnUrl) ? { returnUrl: normalizeReturnUrl(returnUrl) } : {}),
  };
  return signJwtPayload(payload);
}

/** 精簡 token（URL，避免過長） */
export async function signMinimalHandoffToken(
  criteria: ExternalSessionCriteria,
  returnUrl: unknown
): Promise<string> {
  const payload: Record<string, unknown> = {
    histno: criteria.histno,
    caseno: criteria.caseno,
    docid: criteria.docid,
    ...(normalizeReturnUrl(returnUrl) ? { returnUrl: normalizeReturnUrl(returnUrl) } : {}),
  };
  return signJwtPayload(payload);
};

export async function verifyPatientSessionHandoff(
  token: string
): Promise<{ criteria: ExternalSessionCriteria; returnUrl: string } | null> {
  const normalized = token.trim();
  if (!normalized) return null;

  try {
    const { payload } = await jwtVerify(normalized, getHandoffSecret(), {
      algorithms: ["HS256"],
    });

    const record = payload as Record<string, unknown>;
    const returnUrl = normalizeReturnUrl(record.returnUrl);
    const criteria = buildExternalSessionCriteriaFromRecord(stripJwtMeta(record));

    if (!criteria) {
      return null;
    }

    return { criteria, returnUrl };
  } catch {
    return null;
  }
}

export function mergeHandoffCriteria(
  primary: ExternalSessionCriteria,
  secondary: ExternalSessionCriteria | null | undefined
): ExternalSessionCriteria {
  if (!secondary) return primary;

  if (
    primary.histno !== secondary.histno ||
    primary.caseno !== secondary.caseno ||
    primary.docid !== secondary.docid
  ) {
    return primary;
  }

  return {
    ...primary,
    vitals: secondary.vitals ?? primary.vitals,
    medicalInfo: secondary.medicalInfo ?? primary.medicalInfo,
  };
}

export async function resolveHandoffFromTokens(
  urlToken: string,
  cookieToken: string
): Promise<{ criteria: ExternalSessionCriteria; returnUrl: string } | null> {
  const urlHandoff = urlToken ? await verifyPatientSessionHandoff(urlToken) : null;
  const cookieHandoff = cookieToken ? await verifyPatientSessionHandoff(cookieToken) : null;

  if (!urlHandoff && !cookieHandoff) {
    return null;
  }

  const base = urlHandoff ?? cookieHandoff!;
  const extra =
    urlHandoff && cookieHandoff && !urlHandoff.criteria.medicalInfo && !urlHandoff.criteria.vitals
      ? cookieHandoff.criteria
      : null;

  return {
    criteria: mergeHandoffCriteria(base.criteria, extra),
    returnUrl: urlHandoff?.returnUrl || cookieHandoff?.returnUrl || "",
  };
}

export async function buildHandoffRedirectPath(
  criteria: ExternalSessionCriteria,
  returnUrl: unknown
): Promise<string> {
  const MAX_URL_TOKEN_LEN = 2400;
  let token = await signPatientSessionHandoff(criteria, returnUrl);

  if (token.length > MAX_URL_TOKEN_LEN) {
    token = await signMinimalHandoffToken(criteria, returnUrl);
  }

  return `/?${PATIENT_SESSION_HANDOFF_QUERY_KEY}=${encodeURIComponent(token)}`;
}

export async function attachPatientSessionHandoffCookie(
  res: NextResponse,
  criteria: ExternalSessionCriteria,
  returnUrl: unknown
): Promise<NextResponse> {
  const token = await signPatientSessionHandoff(criteria, returnUrl);

  res.cookies.set(PATIENT_SESSION_HANDOFF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: HANDOFF_TTL_SEC,
    path: "/",
  });

  return res;
}

export function clearPatientSessionHandoffCookie(res: NextResponse): NextResponse {
  res.cookies.set(PATIENT_SESSION_HANDOFF_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return res;
}
