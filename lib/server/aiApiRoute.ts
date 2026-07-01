/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/app/actions/formalAiActions";
import { parseCriteriaInput } from "@/lib/server/erMedicalRecord";
import { buildAiMessageWithPatient } from "@/lib/utils/buildAiPatientContext";
import {
  type AITriggerType,
  type AIItem,
  formatItemsByTrigger,
} from "@/lib/utils/aiFormatters";

export type AiEndpointKey =
  | "chief-complaint"
  | "icd"
  | "history-summary"
  | "current-assessment"
  | "admission";

type AiEndpointConfig = {
  featureType: AITriggerType;
  promptDefault: string;
  promptLocal: string;
  label: string;
};

export const AI_ENDPOINT_CONFIG: Record<AiEndpointKey, AiEndpointConfig> = {
  "chief-complaint": {
    featureType: "chiefComplaint",
    promptDefault: "Diagnosis-Chief complaint",
    promptLocal: "Local-Diagnosis-Chief complaint",
    label: "主述分析",
  },
  icd: {
    featureType: "icd",
    promptDefault: "ICD-mapping",
    promptLocal: "Local-ICD-mapping",
    label: "ICD 診斷推薦",
  },
  "history-summary": {
    featureType: "HistorySP",
    promptDefault: "Admission Note-Progress summary",
    promptLocal: "Local-Admission-Progress summary",
    label: "歷程記錄 AI 摘要",
  },
  "current-assessment": {
    featureType: "CurrAsse",
    promptDefault: "Diagnosis-PastHistory-Chief",
    promptLocal: "Local-Diagnosis-Past-Chief",
    label: "本次病況 AI 診斷推論",
  },
  admission: {
    featureType: "Admission",
    promptDefault: "Admission Note-Past history",
    promptLocal: "Local-Admission Note-Past",
    label: "轉住院 AI 生成病歷",
  },
};

const META_KEYS = new Set([
  "sex",
  "性別",
  "age",
  "年齡",
  "docid",
  "histno",
  "caseno",
  "sourceMode",
  "medicalData",
  "spData",
  "content",
  "內容",
]);

const withCors = (req: NextRequest, res: NextResponse) => {
  void req;
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
};

export async function parseApiCriteria(
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
      return parseCriteriaInput(formData.get("criteria"));
    }
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    return parseCriteriaInput(params.get("criteria"));
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
    return parseCriteriaInput(params.get("criteria"));
  }
}

const pickString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const omitMetaFields = (criteria: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(criteria)) {
    if (!META_KEYS.has(key)) {
      result[key] = value;
    }
  }
  return result;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export function extractContextData(
  endpoint: AiEndpointKey,
  criteria: Record<string, unknown>
): unknown {
  const medicalData = asRecord(criteria.medicalData);
  const spData = asRecord(criteria.spData);
  const rootFields = omitMetaFields(criteria);

  switch (endpoint) {
    case "chief-complaint": {
      const direct =
        pickString(criteria.content) ||
        pickString(criteria.內容) ||
        pickString(criteria.chiefComplaint) ||
        pickString(medicalData?.chiefComplaint);
      if (direct) return direct;
      if (Object.keys(rootFields).length > 0) return rootFields;
      return "";
    }
    case "icd":
    case "current-assessment":
      return medicalData && Object.keys(medicalData).length > 0 ? medicalData : rootFields;
    case "history-summary":
      return spData && Object.keys(spData).length > 0 ? spData : rootFields;
    case "admission":
      return { ...(spData ?? {}), ...(medicalData ?? {}), ...rootFields };
    default:
      return rootFields;
  }
}

export function extractDemographics(criteria: Record<string, unknown>) {
  const sex = pickString(criteria.sex) || pickString(criteria.性別) || "未知";
  const ageRaw = criteria.age ?? criteria.年齡 ?? "";
  const age: string | number =
    ageRaw === "" || ageRaw === null || ageRaw === undefined
      ? ""
      : typeof ageRaw === "number"
        ? ageRaw
        : pickString(ageRaw);
  return { sex, age };
}

export function validateContextData(
  endpoint: AiEndpointKey,
  contextData: unknown
): string | null {
  if (endpoint === "chief-complaint") {
    const text = pickString(contextData);
    if (!text) return "缺少主述內容（content / 內容 / chiefComplaint）";
    return null;
  }

  if (!contextData || typeof contextData !== "object" || Array.isArray(contextData)) {
    return "缺少業務資料欄位";
  }

  if (Object.keys(contextData as object).length === 0) {
    return "criteria 內無有效業務資料";
  }

  return null;
}

export async function handleAiApiRequest(
  req: NextRequest,
  endpoint: AiEndpointKey
): Promise<NextResponse> {
  try {
    const criteria = await parseApiCriteria(req);
    if (!criteria) {
      return withCors(
        req,
        NextResponse.json(
          { success: false, error: "缺少 criteria 參數或格式錯誤" },
          { status: 400 }
        )
      );
    }

    const config = AI_ENDPOINT_CONFIG[endpoint];
    const contextData = extractContextData(endpoint, criteria);
    const validationError = validateContextData(endpoint, contextData);
    if (validationError) {
      return withCors(
        req,
        NextResponse.json({ success: false, error: validationError }, { status: 400 })
      );
    }

    const demographics = extractDemographics(criteria);
    const sourceMode = pickString(criteria.sourceMode) || "Default";
    const prompt =
      sourceMode === "Local" ? config.promptLocal : config.promptDefault;

    const message = buildAiMessageWithPatient(contextData, demographics);
    const result = await generateAIResponse(message, prompt, {
      docid: pickString(criteria.docid),
      histno: pickString(criteria.histno),
      caseno: pickString(criteria.caseno),
      featureType: config.featureType,
      sourceMode,
    });

    if (!result.success || result.output === undefined) {
      return withCors(
        req,
        NextResponse.json(
          {
            success: false,
            error: result.message || "AI 服務呼叫失敗",
          },
          { status: 502 }
        )
      );
    }

    const items: AIItem[] = formatItemsByTrigger(config.featureType, result.output);

    return withCors(
      req,
      NextResponse.json({
        success: true,
        featureType: config.featureType,
        label: config.label,
        items,
        rawOutput: result.output,
      })
    );
  } catch (error) {
    console.error(`[api/ai/${endpoint}]`, error);
    return withCors(
      req,
      NextResponse.json({ success: false, error: "伺服器錯誤，請稍後再試" }, { status: 500 })
    );
  }
}

export function createAiRouteHandlers(endpoint: AiEndpointKey) {
  return {
    OPTIONS: (req: NextRequest) =>
      withCors(req, new NextResponse(null, { status: 204 })),
    POST: (req: NextRequest) => handleAiApiRequest(req, endpoint),
  };
}
