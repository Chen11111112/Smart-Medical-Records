import {
  HANDOFF_CLAIMED_SS_KEY,
  PATIENT_SESSION_HANDOFF_API_QUERY_KEY,
  PATIENT_SESSION_HANDOFF_QUERY_KEY,
  PATIENT_SESSION_LS_KEY,
} from "@/lib/constants/patientSession";
import demoPatientSession from "@/lib/data/demo/patientSession.json";

export type PatientSessionBootstrapResult =
  | { ok: true; patientData: Record<string, unknown>; returnUrl: string | null }
  | { ok: false; reason: "handoff_failed" };

export function getUrlHandoffToken(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search)
    .get(PATIENT_SESSION_HANDOFF_QUERY_KEY)
    ?.trim() ?? "";
}

export function stripHandoffFromUrl(): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has(PATIENT_SESSION_HANDOFF_QUERY_KEY)) return;

  url.searchParams.delete(PATIENT_SESSION_HANDOFF_QUERY_KEY);
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

export function hasErsOpener(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.opener && !window.opener.closed);
}

export function clearStoredPatientSession(): void {
  try {
    localStorage.removeItem(PATIENT_SESSION_LS_KEY);
  } catch {
    /* ignore */
  }
}

function readStoredPatientSession(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(PATIENT_SESSION_LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function markHandoffClaimed(): void {
  try {
    sessionStorage.setItem(HANDOFF_CLAIMED_SS_KEY, "1");
  } catch {
    /* ignore */
  }
}

function wasHandoffClaimed(): boolean {
  try {
    return sessionStorage.getItem(HANDOFF_CLAIMED_SS_KEY) === "1";
  } catch {
    return false;
  }
}

let inflightBootstrap: Promise<PatientSessionBootstrapResult> | null = null;

async function runBootstrapPatientSession(): Promise<PatientSessionBootstrapResult> {
  const urlToken = getUrlHandoffToken();
  const hasOpener = hasErsOpener();

  if (wasHandoffClaimed()) {
    const stored = readStoredPatientSession();
    if (stored) {
      stripHandoffFromUrl();
      return { ok: true, patientData: stored, returnUrl: null };
    }
  }

  const shouldAttemptHandoff = Boolean(urlToken) || hasOpener;

  if (urlToken) {
    clearStoredPatientSession();
  }

  if (shouldAttemptHandoff) {
    const handoffQuery = urlToken
      ? `${PATIENT_SESSION_HANDOFF_API_QUERY_KEY}=${encodeURIComponent(urlToken)}`
      : "";
    const handoffUrl = handoffQuery
      ? `/api/session-handoff?${handoffQuery}`
      : "/api/session-handoff";

    const response = await fetch(handoffUrl, {
      credentials: "same-origin",
      cache: "no-store",
    });

    const handoffResult = (await response.json().catch(() => null)) as
      | {
          success?: boolean;
          patientData?: Record<string, unknown>;
          returnUrl?: string | null;
          error?: string;
        }
      | null;

    if (response.ok && handoffResult?.success && handoffResult.patientData) {
      localStorage.setItem(
        PATIENT_SESSION_LS_KEY,
        JSON.stringify(handoffResult.patientData)
      );
      markHandoffClaimed();
      stripHandoffFromUrl();
      return {
        ok: true,
        patientData: handoffResult.patientData,
        returnUrl: handoffResult.returnUrl ?? null,
      };
    }

    if (urlToken || hasOpener) {
      return { ok: false, reason: "handoff_failed" };
    }
  }

  const stored = readStoredPatientSession();
  if (stored) {
    return { ok: true, patientData: stored, returnUrl: null };
  }

  const demoData = demoPatientSession as Record<string, unknown>;
  try {
    localStorage.setItem(PATIENT_SESSION_LS_KEY, JSON.stringify(demoData));
  } catch {
    /* ignore */
  }
  return { ok: true, patientData: demoData, returnUrl: null };
}

export function bootstrapPatientSession(): Promise<PatientSessionBootstrapResult> {
  if (!inflightBootstrap) {
    inflightBootstrap = runBootstrapPatientSession().finally(() => {
      inflightBootstrap = null;
    });
  }
  return inflightBootstrap;
}
