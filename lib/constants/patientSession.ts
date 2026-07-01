export const PATIENT_SESSION_LS_KEY = "emergency_web_patient_session";
export const ERS_RETURN_URL_SS_KEY = "emergency_web_return_url";
export const ERS_OPENED_AS_POPUP_SS_KEY = "emergency_web_opened_as_popup";
/** fetch POST 後 window.open 時，由伺服器暫存 session 的 HttpOnly cookie */
export const PATIENT_SESSION_HANDOFF_COOKIE = "emergency_web_handoff";
/** redirectUrl 查詢參數，院方 window.open 時帶入（不依賴跨域 Cookie） */
export const PATIENT_SESSION_HANDOFF_QUERY_KEY = "_hs";
/** session-handoff API 查詢參數 */
export const PATIENT_SESSION_HANDOFF_API_QUERY_KEY = "hs";
/** 本頁已成功領取 handoff，避免 React 嚴格模式重複請求導致 404 */
export const HANDOFF_CLAIMED_SS_KEY = "emergency_web_handoff_claimed";

