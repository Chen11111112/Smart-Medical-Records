import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/lib/db";
import type { AITriggerType } from "@/lib/utils/aiFormatters";

export type WhisperInputType = "record" | "upload";

export interface AiUsageLogInput {
  docid: string;
  histno?: string;
  caseno?: string;
  featureType: AITriggerType;
  sourceMode?: string;
}

export interface WhisperUsageLogInput {
  docid: string;
  histno?: string;
  caseno?: string;
  inputType: WhisperInputType;
  sessionId?: string;
  fileName?: string;
  success?: boolean;
}

export interface AiResponseLogInput {
  docid: string;
  histno?: string;
  caseno?: string;
  featureType: AITriggerType;
  promptType: string;
  sourceMode?: string;
  requestMessage: string;
  responseOutput?: unknown;
  success: boolean;
  errorMessage?: string;
}

export interface AiFeatureStatRow {
  feature_type: string;
  click_count: number;
  doctor_count: number;
}

export interface WhisperStatRow {
  input_type: WhisperInputType;
  usage_count: number;
}

export interface AiUsageByDoctorRow {
  docid: string;
  feature_type: string;
  click_count: number;
}

export async function insertAiFeatureUsage(input: AiUsageLogInput): Promise<void> {
  const pool = getDbPool();
  await pool.query(
    `INSERT INTO ai_feature_usage (docid, histno, caseno, feature_type, source_mode, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.docid || "",
      input.histno || null,
      input.caseno || null,
      input.featureType,
      input.sourceMode || "Default",
      new Date(),
    ]
  );
}

export async function insertWhisperUsage(input: WhisperUsageLogInput): Promise<void> {
  const pool = getDbPool();
  await pool.query(
    `INSERT INTO whisper_usage (docid, histno, caseno, input_type, session_id, file_name, success, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.docid || "",
      input.histno || null,
      input.caseno || null,
      input.inputType,
      input.sessionId || null,
      input.fileName || null,
      input.success === false ? 0 : 1,
      new Date(),
    ]
  );
}

export async function insertAiResponseLog(input: AiResponseLogInput): Promise<void> {
  const pool = getDbPool();
  const responseJson =
    input.responseOutput === undefined
      ? null
      : JSON.stringify(input.responseOutput);

  await pool.query(
    `INSERT INTO ai_response_log
      (docid, histno, caseno, feature_type, prompt_type, source_mode,
       request_message, response_output, success, error_message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.docid || "",
      input.histno || null,
      input.caseno || null,
      input.featureType,
      input.promptType,
      input.sourceMode || "Default",
      input.requestMessage,
      responseJson,
      input.success ? 1 : 0,
      input.errorMessage || null,
      new Date(),
    ]
  );
}

export async function queryAiFeatureStats(): Promise<AiFeatureStatRow[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT feature_type,
            COUNT(*) AS click_count,
            COUNT(DISTINCT docid) AS doctor_count
     FROM ai_feature_usage
     GROUP BY feature_type
     ORDER BY click_count DESC`
  );
  return rows.map((row) => ({
    feature_type: String(row.feature_type),
    click_count: Number(row.click_count),
    doctor_count: Number(row.doctor_count),
  }));
}

export async function queryWhisperStats(): Promise<WhisperStatRow[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT input_type, COUNT(*) AS usage_count
     FROM whisper_usage
     GROUP BY input_type
     ORDER BY usage_count DESC`
  );
  return rows.map((row) => ({
    input_type: row.input_type as WhisperInputType,
    usage_count: Number(row.usage_count),
  }));
}

export async function queryAiUsageByDoctor(): Promise<AiUsageByDoctorRow[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT docid, feature_type, COUNT(*) AS click_count
     FROM ai_feature_usage
     WHERE docid <> ''
     GROUP BY docid, feature_type
     ORDER BY docid, click_count DESC`
  );
  return rows.map((row) => ({
    docid: String(row.docid),
    feature_type: String(row.feature_type),
    click_count: Number(row.click_count),
  }));
}

export async function queryAiResponseLogCount(): Promise<number> {
  const pool = getDbPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ai_response_log`
  );
  return Number(rows[0]?.total ?? 0);
}
