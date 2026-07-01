/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 * 假資料來源：docs/fake_data.md；ICD / 模組套用資料來源：database/Dump20260629.sql
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { ICDItem } from "@/lib/data/icdData";
import type { ModelItem } from "@/lib/data/modelData";
import type { AITriggerType } from "@/lib/utils/aiFormatters";
import type { ErVisitLookup } from "@/lib/server/ersIdentifiers";
import type { ErMedicalRecordPayload } from "@/lib/server/erMedicalRecord";

import patientSessionJson from "@/lib/data/demo/patientSession.json";
import spHistoryJson from "@/lib/data/demo/spHistory.json";
import vitalSignsJson from "@/lib/data/demo/vitalSigns.json";
import aiChiefComplaintJson from "@/lib/data/demo/aiChiefComplaint.json";
import aiIcdJson from "@/lib/data/demo/aiIcd.json";
import aiHistorySummaryJson from "@/lib/data/demo/aiHistorySummary.json";
import aiCurrentAssessmentJson from "@/lib/data/demo/aiCurrentAssessment.json";
import aiAdmissionJson from "@/lib/data/demo/aiAdmission.json";
import demoModelJson from "@/lib/data/demo/model.json";

const DEMO_DIR = join(process.cwd(), "lib", "data", "demo");

let cachedIcdList: ICDItem[] | null = null;

function loadDemoIcdList(): ICDItem[] {
  if (cachedIcdList) return cachedIcdList;
  const raw = readFileSync(join(DEMO_DIR, "icd.json"), "utf-8");
  cachedIcdList = JSON.parse(raw) as ICDItem[];
  return cachedIcdList;
}

const DEMO_MODEL_LIST = demoModelJson as ModelItem[];

export function getDemoPatientSession(
  overrides?: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...(patientSessionJson as Record<string, unknown>),
    ...(overrides ?? {}),
  };
}

export function getDemoVitalSigns() {
  return vitalSignsJson as {
    success: boolean;
    data: Record<string, string>;
  };
}

export function getDemoSpHistory() {
  return spHistoryJson as {
    success: boolean;
    data: Record<string, unknown>;
  };
}

export function getDemoAiOutput(
  featureType: AITriggerType | string,
  prompt?: string
): unknown {
  const promptKey = (prompt ?? "").toLowerCase();
  if (featureType === "icd" || promptKey.includes("icd")) {
    return aiIcdJson;
  }
  if (featureType === "HistorySP" || promptKey.includes("progress summary")) {
    return aiHistorySummaryJson;
  }
  if (featureType === "CurrAsse" || promptKey.includes("past-chief")) {
    return aiCurrentAssessmentJson;
  }
  if (featureType === "Admission" || promptKey.includes("admission")) {
    return aiAdmissionJson;
  }
  return aiChiefComplaintJson;
}

export function searchDemoIcd(keywords: string[]): ICDItem[] {
  if (keywords.length === 0) return [];
  const limit = 20;
  const merged = new Map<string, ICDItem>();
  const list = loadDemoIcdList();

  for (const keyword of keywords) {
    const lower = keyword.toLowerCase();
    const pattern = lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(pattern, "i");

    for (const row of list) {
      if (merged.size >= limit * keywords.length) break;
      if (re.test(row.zhName) || re.test(row.enName) || re.test(row.id)) {
        if (!merged.has(row.id)) {
          merged.set(row.id, row);
        }
      }
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.use - a.use || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function getDemoModelList(): ModelItem[] {
  return DEMO_MODEL_LIST;
}

export function getDemoErVisit(_histno: string, _caseno: string): ErVisitLookup {
  const session = patientSessionJson as Record<string, string>;
  return {
    success: true,
    erdhist: session["病歷號"] ?? "95270841",
    ercaseno: session["就診號"] ?? "O8841923",
    erttbkey: session["流水號"] ?? "5849301",
    docid: session["醫生ID"] ?? "1234",
  };
}

export function getDemoErMedicalRecord(
  _erdhist: string,
  _ercaseno: string
): ErMedicalRecordPayload | null {
  return null;
}

export function getDemoTranscriptionText(): string {
  return "Patient fell and hit left frontal area with swelling and abrasion since last night.";
}

export function getDemoSoapSummary(): string {
  return [
    "S: Patient reports fall with head injury to left frontal area.",
    "O: 0.7cm abrasion left brow, left frontal swelling, bilateral knee ecchymosis.",
    "A: Head injury with scalp contusion; rule out intracranial hemorrhage.",
    "P: CT head, monitor neurological status, hold anticoagulant pending evaluation.",
  ].join("\n");
}

export function getDemoErsReportHtml(): string {
  return "<html><body><h3>DEMO 報告</h3><p>此為示範用假資料，非實際檢查報告。</p></body></html>";
}

export async function demoSaveMedicalRecord(): Promise<{
  success: true;
  message: string;
}> {
  return { success: true, message: "DEMO：資料已模擬儲存成功" };
}
