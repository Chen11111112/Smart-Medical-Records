import { parseCriteriaInput } from "@/lib/server/erMedicalRecord";
import {
  clampMedicalFieldText,
  type MedicalTextFieldKey,
} from "@/lib/constants/fieldLimits";

export type ExternalSessionVitals = {
  bp_s: string;
  bp_d: string;
  bt: string;
  pr: string;
  bw: string;
  rr: string;
  painAssessment: string;
};

export type ExternalSessionIcd = {
  id: string;
  zhName: string;
  enName: string;
  use: number;
};

export type ExternalSessionMedicalInfo = {
  chiefComplaint: string;
  presentIllness: string;
  pastHistory: string;
  generalCondition: string;
  heent: string;
  neck: string;
  chestAndLungs: string;
  abdomen: string;
  backAndSpine: string;
  exogenitalia: string;
  rectalExam: string;
  extremities: string;
  neurologicalExam: string;
  icd: ExternalSessionIcd;
  icdList: ExternalSessionIcd[];
};

export type ExternalSessionCriteria = {
  histno: string;
  caseno: string;
  docid: string;
  vitals?: ExternalSessionVitals;
  medicalInfo?: ExternalSessionMedicalInfo;
};

const MEDICAL_TEXT_KEYS: MedicalTextFieldKey[] = [
  "chiefComplaint",
  "presentIllness",
  "pastHistory",
  "generalCondition",
  "heent",
  "neck",
  "chestAndLungs",
  "abdomen",
  "backAndSpine",
  "exogenitalia",
  "rectalExam",
  "extremities",
  "neurologicalExam",
];

const VITAL_KEYS = ["bp_s", "bp_d", "bt", "pr", "bw", "rr", "painAssessment"] as const;

const ERS_TO_MEDICAL_KEY = {
  erdia01: "chiefComplaint",
  erdia04: "presentIllness",
  erdia08: "pastHistory",
  erdib01: "generalCondition",
  erdib03: "heent",
  erdib04: "neck",
  erdib05: "chestAndLungs",
  erdib07: "abdomen",
  erdib09: "backAndSpine",
  erdib10: "exogenitalia",
  erdib11: "rectalExam",
  erdib12: "extremities",
  erdib13: "neurologicalExam",
} as const satisfies Record<string, MedicalTextFieldKey>;

const ERS_TO_VITAL_KEY = {
  erdta03: "bp_s",
  erdta031: "bp_d",
  erdta06: "bt",
  erdta04: "pr",
  erdta05: "rr",
  erditkg1: "bw",
  erdta032: "painAssessment",
} as const satisfies Record<string, (typeof VITAL_KEYS)[number]>;

const FIELD_ALIASES = {
  histno: ["histno", "HISTNO", "erdhist", "ERDHIST", "病歷號"],
  caseno: ["caseno", "CASENO", "ercaseno", "ERCASENO", "就診號", "就診序號"],
  docid: ["docid", "DOCID", "ersdinpn", "ERSDINPN", "醫師ID", "醫生ID"],
} as const;

const normalizeScalar = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const pickField = (
  source: Record<string, unknown>,
  field: keyof typeof FIELD_ALIASES
): string => {
  for (const key of FIELD_ALIASES[field]) {
    const value = normalizeScalar(source[key]);
    if (value) return value;
  }
  return "";
};

const parseIcdItem = (raw: unknown): ExternalSessionIcd | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const id = normalizeScalar(item.id);
  const zhName = normalizeScalar(item.zhName);
  const enName = normalizeScalar(item.enName);
  const useRaw = item.use;
  const use =
    typeof useRaw === "number" && Number.isFinite(useRaw) ? useRaw : Number(useRaw) || 0;

  if (!id && !zhName && !enName) return null;

  return {
    id: id.slice(0, 10),
    zhName,
    enName,
    use,
  };
};

const parseMedicalInfo = (raw: unknown): ExternalSessionMedicalInfo | undefined => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;

  const source = raw as Record<string, unknown>;
  const medicalInfo = {} as ExternalSessionMedicalInfo;

  for (const key of MEDICAL_TEXT_KEYS) {
    medicalInfo[key] = clampMedicalFieldText(source[key], key);
  }

  const icdListRaw = Array.isArray(source.icdList) ? source.icdList : [];
  const icdList = icdListRaw
    .map(parseIcdItem)
    .filter((item): item is ExternalSessionIcd => item !== null)
    .slice(0, 5);

  const icdFromRoot = parseIcdItem(source.icd);
  medicalInfo.icd = icdFromRoot ?? icdList[0] ?? { id: "", zhName: "", enName: "", use: 0 };
  medicalInfo.icdList = icdList.length > 0 ? icdList : icdFromRoot ? [icdFromRoot] : [];

  const hasContent =
    MEDICAL_TEXT_KEYS.some((key) => Boolean(medicalInfo[key])) ||
    medicalInfo.icdList.length > 0 ||
    Boolean(medicalInfo.icd.id);

  return hasContent ? medicalInfo : undefined;
};

const parseVitals = (raw: unknown): ExternalSessionVitals | undefined => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;

  const source = raw as Record<string, unknown>;
  const vitals = {} as ExternalSessionVitals;

  for (const key of VITAL_KEYS) {
    vitals[key] = normalizeScalar(source[key]);
  }

  const hasContent = VITAL_KEYS.some((key) => Boolean(vitals[key]));
  return hasContent ? vitals : undefined;
};

const buildMedicalInfoRecord = (source: Record<string, unknown>): Record<string, unknown> => {
  const merged: Record<string, unknown> = {};

  const nested = source.medicalInfo;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    Object.assign(merged, nested);
  }

  for (const [ersKey, medicalKey] of Object.entries(ERS_TO_MEDICAL_KEY)) {
    const flatValue = normalizeScalar(source[ersKey]);
    if (flatValue && !normalizeScalar(merged[medicalKey])) {
      merged[medicalKey] = flatValue;
    }
  }

  if (!merged.icdList && Array.isArray(source.icdList)) {
    merged.icdList = source.icdList;
  }

  return merged;
};

const buildVitalsRecord = (source: Record<string, unknown>): Record<string, unknown> => {
  const merged: Record<string, unknown> = {};

  const nested = source.vitals;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    Object.assign(merged, nested);
  }

  for (const [ersKey, vitalKey] of Object.entries(ERS_TO_VITAL_KEY)) {
    const flatValue = normalizeScalar(source[ersKey]);
    if (flatValue && !normalizeScalar(merged[vitalKey])) {
      merged[vitalKey] = flatValue;
    }
  }

  return merged;
};

/** 將 criteria 物件（含 ERS 扁平欄位或巢狀 vitals / medicalInfo）正規化 */
export function buildExternalSessionCriteriaFromRecord(
  source: Record<string, unknown>
): ExternalSessionCriteria | null {
  const histno = pickField(source, "histno");
  const caseno = pickField(source, "caseno");
  const docid = pickField(source, "docid");

  if (!histno || !caseno || !docid) {
    return null;
  }

  const vitals = parseVitals(buildVitalsRecord(source));
  const medicalInfo = parseMedicalInfo(buildMedicalInfoRecord(source));

  return {
    histno: histno.slice(0, 10),
    caseno: caseno.slice(0, 12),
    docid: docid.slice(0, 8),
    ...(vitals ? { vitals } : {}),
    ...(medicalInfo ? { medicalInfo } : {}),
  };
};

export async function parseExternalSessionRequest(
  req: Request
): Promise<ExternalSessionCriteria | null> {
  const contentType = req.headers.get("content-type") || "";
  let criteriaRaw: unknown = null;

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return null;

    if (body.criteria !== undefined) {
      criteriaRaw = parseCriteriaInput(body.criteria);
    } else {
      criteriaRaw = body;
    }
  } else if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData().catch(() => null);
      if (!formData) return null;
      criteriaRaw = parseCriteriaInput(formData.get("criteria"));
    } else {
      const raw = await req.text();
      const params = new URLSearchParams(raw);
      criteriaRaw = parseCriteriaInput(params.get("criteria"));
    }
  } else {
    const raw = await req.text();
    if (!raw.trim()) return null;

    try {
      const maybeJson = JSON.parse(raw) as Record<string, unknown>;
      criteriaRaw =
        maybeJson.criteria !== undefined
          ? parseCriteriaInput(maybeJson.criteria)
          : maybeJson;
    } catch {
      const params = new URLSearchParams(raw);
      criteriaRaw = parseCriteriaInput(params.get("criteria"));
    }
  }

  if (!criteriaRaw || typeof criteriaRaw !== "object" || Array.isArray(criteriaRaw)) {
    return null;
  }

  return buildExternalSessionCriteriaFromRecord(criteriaRaw as Record<string, unknown>);
}

export function mergeExternalSessionPayload(
  patientSession: Record<string, unknown>,
  criteria: ExternalSessionCriteria
): Record<string, unknown> {
  return {
    ...patientSession,
    histno: criteria.histno,
    caseno: criteria.caseno,
    docid: criteria.docid,
    ...(criteria.vitals ? { vitals: criteria.vitals } : {}),
    ...(criteria.medicalInfo ? { medicalInfo: criteria.medicalInfo } : {}),
  };
}
