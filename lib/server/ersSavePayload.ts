import {
  normalizeErdhist,
  normalizeErcaseno,
  normalizeErsdinpn,
} from "@/lib/utils/ersFormat";

const FIELD_LIMITS: Record<string, number> = {
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
  icd10codes: 10,
};

export const ERS_API_FIELDS = [
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
  "icd10codes",
] as const;

export type ErsApiField = (typeof ERS_API_FIELDS)[number];

const normalizeTextField = (value: unknown, limit: number) =>
  String(value ?? "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);

export function buildErsSavePayload(data: Record<string, unknown>) {
  const payload: Partial<Record<ErsApiField, string | string[]>> = {
    erdhist: normalizeErdhist(data.erdhist),
    ercaseno: normalizeErcaseno(data.ercaseno),
    ersdinpn: normalizeErsdinpn(data.ersdinpn),
  };

  for (const key of ERS_API_FIELDS) {
    if (key === "erdhist" || key === "ercaseno" || key === "ersdinpn") {
      continue;
    }

    if (key === "icd10codes") {
      const source = Array.isArray(data.icd10codes) ? data.icd10codes : [];
      payload.icd10codes = source
        .map((item) => normalizeTextField(item, FIELD_LIMITS.icd10codes))
        .filter(Boolean)
        .slice(0, 5);
      continue;
    }

    payload[key] = normalizeTextField(data[key], FIELD_LIMITS[key]);
  }

  return payload;
}
