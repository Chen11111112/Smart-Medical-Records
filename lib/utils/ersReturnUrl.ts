import {
  ERS_OPENED_AS_POPUP_SS_KEY,
  ERS_RETURN_URL_SS_KEY,
  HANDOFF_CLAIMED_SS_KEY,
  PATIENT_SESSION_LS_KEY,
} from "@/lib/constants/patientSession";

const ERS_HOST_PATTERN = /\/ERS/i;

export function isErsUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    return ERS_HOST_PATTERN.test(new URL(trimmed).href);
  } catch {
    return ERS_HOST_PATTERN.test(trimmed);
  }
}

export function normalizeReturnUrl(url: unknown): string {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.href;
  } catch {
    return "";
  }
}

export function getDefaultErsReturnUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ERS_RETURN_URL?.trim() || "";
  return normalizeReturnUrl(fromEnv);
}

export function persistReturnUrl(url: unknown): void {
  const normalized = normalizeReturnUrl(url);
  if (!normalized) return;
  try {
    sessionStorage.setItem(ERS_RETURN_URL_SS_KEY, normalized);
  } catch {
    /* ignore */
  }
}

export function getStoredReturnUrl(): string {
  try {
    return normalizeReturnUrl(sessionStorage.getItem(ERS_RETURN_URL_SS_KEY));
  } catch {
    return "";
  }
}

export function resolveReturnUrl(): string {
  return (
    getStoredReturnUrl() ||
    (isErsUrl(document.referrer) ? normalizeReturnUrl(document.referrer) : "") ||
    getDefaultErsReturnUrl()
  );
}

export function markOpenedAsErsPopup(): void {
  try {
    sessionStorage.setItem(ERS_OPENED_AS_POPUP_SS_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function wasOpenedAsErsPopup(): boolean {
  try {
    return sessionStorage.getItem(ERS_OPENED_AS_POPUP_SS_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearPatientSessionStorage(): void {
  try {
    localStorage.removeItem(PATIENT_SESSION_LS_KEY);
    sessionStorage.removeItem(ERS_RETURN_URL_SS_KEY);
    sessionStorage.removeItem(ERS_OPENED_AS_POPUP_SS_KEY);
    sessionStorage.removeItem(HANDOFF_CLAIMED_SS_KEY);
  } catch {
    /* ignore */
  }
}
