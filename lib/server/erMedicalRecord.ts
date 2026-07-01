/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import { getDemoErMedicalRecord } from "@/lib/server/demoFakeData";

export const ER_RECORD_FIELD_LIMITS: Record<string, number> = {
  erdhist: 10,
  ercaseno: 12,
  ersdinpn: 8,
  erdia01: 180,
  erdia04: 240,
  erdia08: 180,
  erdib01: 120,
  erdib03: 60,
  erdib04: 60,
  erdib05: 120,
  erdib07: 120,
  erdib09: 60,
  erdib10: 60,
  erdib11: 60,
  erdib12: 60,
  erdib13: 60,
};

export const ER_RECORD_FIELDS = [
  "erdhist",
  "ercaseno",
  "ersdinpn",
  "erdia01",
  "erdia04",
  "erdia08",
  "erdib01",
  "erdib03",
  "erdib04",
  "erdib05",
  "erdib07",
  "erdib09",
  "erdib10",
  "erdib11",
  "erdib12",
  "erdib13",
] as const;

export type ErRecordField = (typeof ER_RECORD_FIELDS)[number];

export type ErMedicalRecordPayload = Record<ErRecordField, string> & {
  icd10codes?: string[];
};

const normalizeString = (value: unknown) =>
  String(value ?? "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function normalizeErMedicalRecord(
  data: Record<string, unknown>
): ErMedicalRecordPayload {
  const payload = {} as ErMedicalRecordPayload;

  for (const key of ER_RECORD_FIELDS) {
    payload[key] = normalizeString(data[key]).slice(0, ER_RECORD_FIELD_LIMITS[key]);
  }

  const rawIcd = data.icd10codes;
  const source = Array.isArray(rawIcd) ? rawIcd : [];
  payload.icd10codes = source
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .slice(0, 5);

  return payload;
}

export function parseCriteriaInput(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  return null;
}

export async function upsertErMedicalRecord(
  data: Record<string, unknown>
): Promise<ErMedicalRecordPayload> {
  const payload = normalizeErMedicalRecord(data);

  if (!payload.erdhist || !payload.ercaseno || !payload.ersdinpn) {
    throw new Error("缺少必要欄位 erdhist, ercaseno 或 ersdinpn");
  }

  return payload;
}

export async function getErMedicalRecord(
  erdhist: string,
  ercaseno: string
): Promise<ErMedicalRecordPayload | null> {
  return getDemoErMedicalRecord(erdhist, ercaseno);
}
