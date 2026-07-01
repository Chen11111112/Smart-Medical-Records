import {
  clearPatientSessionStorage,
  isErsUrl,
  resolveReturnUrl,
  wasOpenedAsErsPopup,
} from "@/lib/utils/ersReturnUrl";

const CLOSE_MESSAGE_TYPE = "emergency_web_close";

type CloseMessage = {
  type: typeof CLOSE_MESSAGE_TYPE;
  status: "saved";
};

export function notifyParentWindowSaved(): void {
  const payload: CloseMessage = {
    type: CLOSE_MESSAGE_TYPE,
    status: "saved",
  };

  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, "*");
    }
  } catch {
    /* ignore cross-origin */
  }

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, "*");
    }
  } catch {
    /* ignore cross-origin */
  }
}

function forceCloseWindow(): void {
  window.open("", "_self", "");
  window.close();
}

export function closeAppWindowAfterSave(): void {
  const openedAsPopup = wasOpenedAsErsPopup() || Boolean(window.opener);

  notifyParentWindowSaved();

  try {
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
    }
  } catch {
    /* cross-origin：僅 focus，不修改 opener 網址 */
  }

  clearPatientSessionStorage();
  forceCloseWindow();

  // 院方另開分頁：ERS 原分頁仍在背景，只需關閉本頁，不做導向
  if (openedAsPopup) {
    return;
  }

  // 若瀏覽器不允許關閉視窗，才 fallback 導回 ERS
  window.setTimeout(() => {
    try {
      if (window.closed) return;

      const target = resolveReturnUrl();
      if (target) {
        window.location.replace(target);
        return;
      }

      if (isErsUrl(document.referrer)) {
        window.history.back();
      }
    } catch {
      /* ignore */
    }
  }, 300);
}
