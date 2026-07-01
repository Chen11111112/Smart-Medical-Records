/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 */

import {
  DEMO_HOSPITAL_INTEGRATION_DISABLED,
  DEMO_HOSPITAL_INTEGRATION_MESSAGE,
  DEMO_WHISPER_DISABLED,
  DEMO_WHISPER_DISABLED_MESSAGE,
} from "@/lib/constants/demoIntegration";

export function isWhisperDisabled() {
  return DEMO_WHISPER_DISABLED;
}

export function getWhisperDisabledMessage() {
  return DEMO_WHISPER_DISABLED_MESSAGE;
}

export function isHospitalIntegrationDisabled() {
  return DEMO_HOSPITAL_INTEGRATION_DISABLED;
}

export function getHospitalIntegrationDisabledMessage() {
  return DEMO_HOSPITAL_INTEGRATION_MESSAGE;
}

export function assertWhisperEnabled(feature: string): void {
  if (!DEMO_WHISPER_DISABLED) return;
  throw new Error(`${DEMO_WHISPER_DISABLED_MESSAGE}（${feature}）`);
}
