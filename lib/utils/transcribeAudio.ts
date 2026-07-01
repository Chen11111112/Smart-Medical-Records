import {
  DEMO_WHISPER_DISABLED,
  DEMO_WHISPER_DISABLED_MESSAGE,
} from "@/lib/constants/demoIntegration";

export type TranscribeResult = {
  success: boolean;
  text?: string;
  error?: string;
  log?: string;
};

export type TranscribeContext = {
  inputType: "record" | "upload";
  docid?: string;
  histno?: string;
  caseno?: string;
};

export async function transcribeAudio(
  file: Blob,
  fileName: string,
  targetApi: string,
  sessionId: string,
  context?: TranscribeContext
): Promise<TranscribeResult> {
  if (DEMO_WHISPER_DISABLED) {
    return {
      success: false,
      error: DEMO_WHISPER_DISABLED_MESSAGE,
      log: DEMO_WHISPER_DISABLED_MESSAGE,
    };
  }

  if (!file.size) {
    return { success: false, error: "請選擇有效的語音檔案", log: "請選擇有效的語音檔案" };
  }

  const formData = new FormData();
  formData.append("file", file, fileName);
  formData.append("target_api", targetApi);
  formData.append("session_id", sessionId);
  if (context?.inputType) {
    formData.append("input_type", context.inputType);
  }
  if (context?.docid) formData.append("docid", context.docid);
  if (context?.histno) formData.append("histno", context.histno);
  if (context?.caseno) formData.append("caseno", context.caseno);

  try {
    const response = await fetch("/api/whisper/transcribe", {
      method: "POST",
      body: formData,
    });

    const raw = await response.text();
    let data: Record<string, unknown> = {};
    if (raw.trim()) {
      try {
        data = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        data = {};
      }
    }

    if (!response.ok) {
      const detail =
        typeof data.detail === "string" && data.detail.trim()
          ? data.detail
          : "";
      const log =
        detail ||
        (typeof data.log === "string" && data.log.trim() ? data.log : "") ||
        raw.trim() ||
        `HTTP ${response.status} ${response.statusText}`.trim();
      return { success: false, error: log, log };
    }

    const text = typeof data.text === "string" ? data.text.trim() : "";
    if (!text) {
      const log = raw.trim() || "辨識完成但未回傳文字";
      return { success: false, error: log, log };
    }

    return { success: true, text };
  } catch (err) {
    const log =
      err instanceof Error ? err.stack || err.message : String(err);
    return { success: false, error: log, log };
  }
}
