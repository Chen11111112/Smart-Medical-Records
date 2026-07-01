/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import {
  mergeExternalSessionPayload,
  type ExternalSessionCriteria,
} from "@/lib/server/externalSessionCriteria";
import { getDemoPatientSession } from "@/lib/server/demoFakeData";

export type ResolvePatientSessionResult =
  | { ok: true; patientData: Record<string, unknown> }
  | { ok: false; error: string; status: number };

export async function resolvePatientSession(
  criteria: ExternalSessionCriteria
): Promise<ResolvePatientSessionResult> {
  const patientData = mergeExternalSessionPayload(
    getDemoPatientSession(),
    criteria
  );
  return { ok: true, patientData };
}
