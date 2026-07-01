/** 從 AI 建議文字（如 "W19.XXXA Unspecified fall, initial encounter"）擷取 ICD-10-CM 代碼 */
export function extractIcdCodeFromText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^([A-TV-Z]\d{2}(?:\.[A-Z0-9]+)?)/i);
  return match ? match[1].toUpperCase() : null;
}
