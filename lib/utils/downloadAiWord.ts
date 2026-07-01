// Whisper / 轉住院病歷生成都需要 download to word
import { AIItem } from "@/lib/utils/aiFormatters";
import { WordAdmissionMeta } from "@/lib/utils/buildWordAdmissionInfo";

export interface WordPatientInfo {
  name: string;
  idNo: string;
  sex: string;
  birthDate: string;
  histno: string;
  wardBed?: string;
}

const ADMISSION_TITLE = "住院病歷(Admission Note)";

const ADMISSION_SECTION_TITLES: Record<string, string> = {
  主訴: "主訴 (Chief complaint)",
  "Chief complaint": "主訴 (Chief complaint)",
  "chief complaint": "主訴 (Chief complaint)",
  現在疾病: "現在疾病 (Present illness)",
  "Present illness": "現在疾病 (Present illness)",
  "present illness": "現在疾病 (Present illness)",
  過去病史: "過去病史 (Past history)",
  "Past history": "過去病史 (Past history)",
  "past history": "過去病史 (Past history)",
  家族史: "家族史 (Family history)",
  "Family history": "家族史 (Family history)",
  "family history": "家族史 (Family history)",
  過敏史: "過敏史 (Allergy history)",
  "Allergy history": "過敏史 (Allergy history)",
  "allergy history": "過敏史 (Allergy history)",
  身體檢查: "身體檢查 (Physical examination)",
  "Physical examination": "身體檢查 (Physical examination)",
  "physical examination": "身體檢查 (Physical examination)",
  檢驗檢查: "檢驗檢查 (Laboratory / Imaging)",
  "Laboratory / Imaging": "檢驗檢查 (Laboratory / Imaging)",
  治療計畫: "治療計畫 (Treatment plan)",
  "Treatment plan": "治療計畫 (Treatment plan)",
  "treatment plan": "治療計畫 (Treatment plan)",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatMarkdownBoldForWordHtml(text: string): string {
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let html = "";

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      html += escapeHtml(text.slice(lastIndex, match.index)).replace(/\n/g, "<br/>");
    }
    html += `<b>${escapeHtml(match[1])}</b>`;
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    html += escapeHtml(text.slice(lastIndex)).replace(/\n/g, "<br/>");
  }

  if (!html) {
    return escapeHtml(text).replace(/\n/g, "<br/>");
  }
  return html;
}

function buildSoapWordHtml(title: string, content: string): string {
  const bodyHtml = formatMarkdownBoldForWordHtml(content);
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: A4;
      margin: 2.54cm;
    }
    div.Section1 { page: Section1; }
  </style>
</head>
<body>
  <div class="Section1">
    <h2 style="font-family:'Microsoft JhengHei',sans-serif;font-size:16pt;">${escapeHtml(title)}</h2>
    <div style="font-family:'Microsoft JhengHei',sans-serif;font-size:11pt;line-height:1.75;white-space:pre-wrap;">
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;
}

function triggerWordDownload(html: string, baseName: string): boolean {
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${baseName}_${date}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

export function downloadSoapReportAsWord(
  content: string,
  filename = "SOAP結構化病歷"
): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  const html = buildSoapWordHtml(filename, trimmed);
  return triggerWordDownload(html, filename);
}

function getCheckedItems(items: AIItem[]): AIItem[] {
  return items
    .map((group) => ({
      ...group,
      options: group.options.filter((opt) => opt.checked),
    }))
    .filter((group) => group.options.length > 0);
}

function formatSexForWord(sex: string): string {
  const s = sex.trim();
  if (s === "男" || s === "1") return "M";
  if (s === "女" || s === "2") return "F";
  return s || "N/A";
}

function formatAdmissionSectionTitle(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "";
  if (/\(.+\)/.test(trimmed)) return trimmed;
  if (ADMISSION_SECTION_TITLES[trimmed]) return ADMISSION_SECTION_TITLES[trimmed];
  const lower = trimmed.toLowerCase();
  const hit = Object.entries(ADMISSION_SECTION_TITLES).find(
    ([k]) => k.toLowerCase() === lower
  );
  return hit ? hit[1] : trimmed;
}

function verticalCell(key: string, value: string, width = "16.66%"): string {
  return `<td width="${width}" style="vertical-align:top;padding:0;border:1px solid #000;">
    <div style="background:#f0f0f0;font-weight:bold;text-align:center;padding:3px 4px;font-size:10pt;">${escapeHtml(key)}</div>
    <div style="text-align:center;padding:5px 2px;min-height:1.2em;font-size:10pt;">${escapeHtml(value || "N/A")}</div>
  </td>`;
}

function buildAdmissionPatientHeaderTable(patient: WordPatientInfo): string {
  return `<table border="1" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-family:'Microsoft JhengHei',sans-serif;">
  <tr>
    ${verticalCell("姓名", patient.name || "N/A")}
    ${verticalCell("身分證號", patient.idNo || "N/A")}
    ${verticalCell("性別", formatSexForWord(patient.sex))}
    ${verticalCell("出生日期", patient.birthDate || "N/A")}
    ${verticalCell("病歷號碼", patient.histno || "N/A")}
  </tr>
</table>`;
}

function metaCell(label: string, value: string): string {
  return `<td width="25%" style="vertical-align:top;padding:2px 6px 4px 0;font-size:10pt;font-family:'Microsoft JhengHei',sans-serif;border:none;">
    <b>${escapeHtml(label)}</b>：${escapeHtml(value || "N/A")}
  </td>`;
}

function buildAdmissionMetaBlock(meta: WordAdmissionMeta): string {
  const smoking =
    meta.抽煙習慣 && meta.抽煙習慣 !== "N/A" ? meta.抽煙習慣 : "無抽煙習慣。";

  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 10px 0;">
  <tr>
    ${metaCell("住院號", meta.住院號)}
    ${metaCell("住院科別", meta.住院科別)}
    ${metaCell("住院日期", meta.住院日期)}
    ${metaCell("住院時間", meta.住院時間)}
  </tr>
  <tr>
    ${metaCell("職業", meta.職業)}
    ${metaCell("血型 / RH", meta.血型RH)}
    ${metaCell("婚姻狀況", meta.婚姻狀況)}
    ${metaCell("身分", meta.身分)}
  </tr>
  <tr>
    ${metaCell("問診日期", meta.問診日期)}
    ${metaCell("問診時間", meta.問診時間)}
    ${metaCell("轉診醫院", meta.轉診醫院)}
    <td width="25%" style="border:none;"></td>
  </tr>
  <tr>
    <td colspan="4" style="padding:4px 6px 2px 0;font-size:10pt;font-family:'Microsoft JhengHei',sans-serif;border:none;">
      <b>抽煙習慣</b>：${escapeHtml(smoking)}
    </td>
  </tr>
  <tr>
    <td colspan="4" style="padding:2px 6px 8px 0;font-size:10pt;font-family:'Microsoft JhengHei',sans-serif;border:none;">
      Is there risk of exposure to second-hand smoke ? ${escapeHtml(meta.二手菸暴露風險 || "No")}
    </td>
  </tr>
</table>`;
}

function buildAdmissionSections(items: AIItem[]): string {
  return items
    .map((group) => {
      const title = formatAdmissionSectionTitle(group.groupLabel);
      const titleHtml = title
        ? `<p style="font-family:'Microsoft JhengHei',sans-serif;font-size:11pt;font-weight:bold;text-decoration:underline;margin:14px 0 8px 0;line-height:1.75;">${escapeHtml(title)}</p>`
        : "";
      const body = group.options
        .map(
          (opt) =>
            `<p style="font-family:'Microsoft JhengHei',sans-serif;font-size:11pt;white-space:pre-wrap;margin:0 0 10px 0;line-height:1.75;">${escapeHtml(opt.text).replace(/\n/g, "<br/>")}</p>`
        )
        .join("");
      return `${titleHtml}${body}`;
    })
    .join("");
}

function buildLegacyPatientHeaderTable(patient: WordPatientInfo): string {
  const name = escapeHtml(patient.name || "");
  const idNo = escapeHtml(patient.idNo || "");
  const sex = escapeHtml(patient.sex || "");
  const birthDate = escapeHtml(patient.birthDate || "");
  const histno = escapeHtml(patient.histno || "");

  return `<table border="1" cellpadding="4" cellspacing="0" width="100%" style="border-collapse:collapse;font-family:'Microsoft JhengHei',sans-serif;font-size:11pt;">
  <tr>
    <td width="15%" style="background:#f0f0f0;"><b>姓名</b></td>
    <td width="35%">${name}</td>
    <td width="15%" style="background:#f0f0f0;"><b>身分證字號</b></td>
    <td width="35%">${idNo}</td>
  </tr>
  <tr>
    <td style="background:#f0f0f0;"><b>性別</b></td>
    <td>${sex}</td>
    <td style="background:#f0f0f0;"><b>出生日期</b></td>
    <td>${birthDate}</td>
  </tr>
  <tr>
    <td style="background:#f0f0f0;"><b>病歷號碼</b></td>
    <td colspan="3">${histno}</td>
  </tr>
</table>`;
}

function buildLegacySections(items: AIItem[]): string {
  return items
    .map((group) => {
      const title = group.groupLabel
        ? `<p style="font-family:'Microsoft JhengHei',sans-serif;font-weight:bold;margin:12px 0 6px 0;line-height:1.75;">${escapeHtml(group.groupLabel)}</p>`
        : "";
      const body = group.options
        .map(
          (opt) =>
            `<p style="font-family:'Microsoft JhengHei',sans-serif;white-space:pre-wrap;margin:0 0 8px 0;line-height:1.75;">${escapeHtml(opt.text).replace(/\n/g, "<br/>")}</p>`
        )
        .join("");
      return `${title}${body}`;
    })
    .join("");
}

function buildAdmissionWordHtml(
  items: AIItem[],
  patient?: WordPatientInfo,
  admissionMeta?: WordAdmissionMeta
): string {
  const headerTable = patient ? buildAdmissionPatientHeaderTable(patient) : "";
  const firstPageMeta = admissionMeta ? buildAdmissionMetaBlock(admissionMeta) : "";
  const sections = buildAdmissionSections(items);

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(ADMISSION_TITLE)}</title>
  <style>
    @page Section1 {
      size: A4;
      margin: 2.54cm;
    }
    div.Section1 { page: Section1; }
  </style>
</head>
<body>
  <div class="Section1">
    
    <p style="font-family:'Microsoft JhengHei',sans-serif;margin: 0 0 12px 0;font-size:16pt;font-weight:bold;text-align:center;">
      ${escapeHtml(ADMISSION_TITLE)}
    </p>
    
    ${headerTable}
    
    <div style="margin-top: 12px;"></div>

    ${firstPageMeta}
    ${sections}
  </div>
</body>
</html>`;
}


function buildLegacyWordHtml(
  title: string,
  items: AIItem[],
  patient?: WordPatientInfo
): string {
  const headerTable = patient ? buildLegacyPatientHeaderTable(patient) : "";
  const sections = buildLegacySections(items);

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: A4;
      margin: 2.54cm;
    }
    div.Section1 { page: Section1; }
  </style>
</head>
<body>
  <div class="Section1">
    <h2 style="font-family:'Microsoft JhengHei',sans-serif;font-size:16pt;">${escapeHtml(title)}</h2>
    ${headerTable}
    <br/>
    ${sections}
  </div>
</body>
</html>`;
}

function buildWordHtml(
  title: string,
  items: AIItem[],
  patient?: WordPatientInfo,
  options?: { admission?: boolean; admissionMeta?: WordAdmissionMeta }
): string {
  if (options?.admission === true) {
    return buildAdmissionWordHtml(items, patient, options.admissionMeta);
  }
  return buildLegacyWordHtml(title, items, patient);
}

function getItemsForWordExport(items: AIItem[]): AIItem[] {
  const hasChecked = items.some((g) => g.options.some((opt) => opt.checked));
  if (hasChecked) return getCheckedItems(items);
  return items.filter((g) => g.options.length > 0);
}

/** 將 AI 結構化回覆下載為 Word（.doc）檔；有勾選則僅含已勾選項目，否則全部寫入 */
export function downloadAiResponseAsWord(
  items: AIItem[],
  filename = "轉住院AI生成病歷",
  patient?: WordPatientInfo,
  options?: { admission?: boolean; admissionMeta?: WordAdmissionMeta }
) {
  const checkedItems = getItemsForWordExport(items);
  if (!checkedItems.length) return false;

  const isAdmission = options?.admission === true;
  const html = buildWordHtml(filename, checkedItems, patient, options);
  const baseName = isAdmission ? ADMISSION_TITLE : filename;
  return triggerWordDownload(html, baseName);
}
