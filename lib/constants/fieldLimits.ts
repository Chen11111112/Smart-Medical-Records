export const MEDICAL_TEXT_FIELDS = [
  { key: 'chiefComplaint', label: 'CHIEF COMPLAINT', limit: 180 },
  { key: 'presentIllness', label: 'PRESENT ILLNESS', limit: 240 },
  { key: 'pastHistory', label: 'PAST HISTORY', limit: 180 },
  { key: 'generalCondition', label: 'GENERAL CONDITION', limit: 120 },
  { key: 'chestAndLungs', label: 'CHEST AND LUNGS', limit: 120 },
  { key: 'abdomen', label: 'ABDOMEN', limit: 120 },
  { key: 'heent', label: 'HEENT', limit: 60 },
  { key: 'neck', label: 'NECK', limit: 60 },
  { key: 'backAndSpine', label: 'BACK AND SPINE', limit: 60 },
  { key: 'exogenitalia', label: 'EXOGENITALIA', limit: 60 },
  { key: 'rectalExam', label: 'RECTAL EXAM', limit: 60 },
  { key: 'extremities', label: 'EXTREMITIES', limit: 60 },
  { key: 'neurologicalExam', label: 'NEUROLOGICAL EXAM', limit: 60 },
] as const;

export type MedicalTextFieldKey = (typeof MEDICAL_TEXT_FIELDS)[number]['key'];

const LIMIT_BY_KEY = Object.fromEntries(
  MEDICAL_TEXT_FIELDS.map(({ key, limit }) => [key, limit])
) as Record<MedicalTextFieldKey, number>;

/** @deprecated 請改用 getFieldCharLimit(fieldKey) */
export const FIELD_CHAR_LIMIT = 500;

export function getFieldCharLimit(key: MedicalTextFieldKey): number {
  return LIMIT_BY_KEY[key];
}

export function isFieldOverLimit(
  value: string | undefined | null,
  key: MedicalTextFieldKey
): boolean {
  return (value ?? '').length > getFieldCharLimit(key);
}

/** 去除首尾與多餘空白（模板帶入用） */
export function normalizeMedicalFieldText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

export function clampMedicalFieldText(
  value: unknown,
  key: MedicalTextFieldKey
): string {
  return normalizeMedicalFieldText(value).slice(0, getFieldCharLimit(key));
}
