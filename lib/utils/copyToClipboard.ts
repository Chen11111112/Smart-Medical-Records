/**
 * 複製文字到剪貼簿。優先使用 Clipboard API，失敗時改用 execCommand 作為後備。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const value = String(text ?? '');
  if (!value.trim()) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* 改用後備方案 */
    }
  }

  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}
