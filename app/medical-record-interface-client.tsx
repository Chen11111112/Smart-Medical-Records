"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/styles/Index.module.scss";
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

import ICDSearch from "@/components/ICDSearch";
import HistoryItems from "@/components/HistoryItems";
import MedicalForm, { type MedicalFormHandle } from "@/components/MedicalForm";
import AI from "@/components/AI";
import MedicalAsr from "@/components/MedicalAsr";
import {SpPayload} from '@/lib/data/spData'

import { ICDItem } from "@/lib/data/icdData";
import {
  ModelItem,
  ModelValue,
  ModelItemPrint,
  ModelPrintValue,
} from "@/lib/data/modelData";
import {calculateAge} from '@/lib/utils/calculateAge'
import { buildWordAdmissionMeta } from "@/lib/utils/buildWordAdmissionInfo";
import { buildChiefComplaintWithPain } from "@/lib/utils/buildChiefComplaintWithPain";
import { getVitalSigns } from "./actions/medicalActions";
import { getProcedureData } from "./actions/formalSpActions";
import { saveMedicalRecord } from "./actions/saveRecordsActions";
import { getErMedicalRecordAction } from "./actions/erMedicalRecordActions";
import { resolveErVisitAction } from "./actions/erVisitActions";
import { PATIENT_SESSION_LS_KEY } from "@/lib/constants/patientSession";
import { useTheme } from "@/context/ThemeContext";
import { displayErcaseno, normalizeErcaseno } from "@/lib/utils/ersFormat";
import { closeAppWindowAfterSave } from "@/lib/utils/closeAppWindow";
import { bootstrapPatientSession } from "@/lib/utils/bootstrapPatientSession";
import { isErsUrl, markOpenedAsErsPopup, persistReturnUrl } from "@/lib/utils/ersReturnUrl";
import {
  DEMO_HOSPITAL_INTEGRATION_DISABLED,
} from "@/lib/constants/demoIntegration";
import type {
  ExternalSessionMedicalInfo,
  ExternalSessionVitals,
} from "@/lib/server/externalSessionCriteria";
const medicalDraftKey = (histno: string, caseno: string) =>
  `emergency_web_medical_draft_${histno}_${caseno}`;

const cleanSaveString = (val: unknown): string => {
  if (typeof val !== "string") return String(val || "");
  return val.replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
};

const pickSessionValue = (source: Record<string, unknown> | null, keys: string[]) => {
  if (!source) return "";
  for (const key of keys) {
    const value = source[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
};

const buildMedicalPayload = (
  medicalInfo: ModelItemPrint,
  histno: string,
  caseno: string,
  docid: string,
  painAssessment = ""
) => {
  const icdList = Array.isArray(medicalInfo.icdList)
    ? medicalInfo.icdList
        .filter((item) => String(item.id ?? "").trim())
        .map((item) => ({
          id: cleanSaveString(item.id),
          zhName: cleanSaveString(item.zhName),
          enName: cleanSaveString(item.enName),
          use: item.use ?? 0,
        }))
    : medicalInfo.icd?.id?.trim()
      ? [
          {
            id: cleanSaveString(medicalInfo.icd.id),
            zhName: cleanSaveString(medicalInfo.icd.zhName),
            enName: cleanSaveString(medicalInfo.icd.enName),
            use: medicalInfo.icd.use ?? 0,
          },
        ]
      : [];

  const primary = icdList[0] ?? { id: "", zhName: "", enName: "", use: 0 };

  return {
    erdhist: cleanSaveString(histno),
    ercaseno: cleanSaveString(caseno),
    ersdinpn: cleanSaveString(docid),
    icd10codes: icdList
      .map((item) => cleanSaveString(item.id))
      .filter(Boolean)
      .slice(0, 5),
    icd: primary.id
      ? {
          id: primary.id,
          zhName: primary.zhName,
          enName: primary.enName,
        }
      : null,
    icdList,
    erdia01: cleanSaveString(
      buildChiefComplaintWithPain(medicalInfo?.chiefComplaint, painAssessment)
    ),
    erdia04: cleanSaveString(medicalInfo?.presentIllness || ""),
    erdia08: cleanSaveString(medicalInfo?.pastHistory || ""),
    erdib01: cleanSaveString(medicalInfo?.generalCondition || ""),
    erdib03: cleanSaveString(medicalInfo?.heent || ""),
    erdib04: cleanSaveString(medicalInfo?.neck || ""),
    erdib05: cleanSaveString(medicalInfo?.chestAndLungs || ""),
    erdib07: cleanSaveString(medicalInfo?.abdomen || ""),
    erdib09: cleanSaveString(medicalInfo?.backAndSpine || ""),
    erdib10: cleanSaveString(medicalInfo?.exogenitalia || ""),
    erdib11: cleanSaveString(medicalInfo?.rectalExam || ""),
    erdib12: cleanSaveString(medicalInfo?.extremities || ""),
    erdib13: cleanSaveString(medicalInfo?.neurologicalExam || ""),
  };
};

const EMPTY_ICD_LIST: ICDItem[] = [];

export default function MedicalRecordInterfaceClient() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [session, setSession] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      try {
        const result = await bootstrapPatientSession();

        if (result.ok) {
          if (!cancelled) {
            setSession(result.patientData);

            if (result.returnUrl) {
              persistReturnUrl(result.returnUrl);
            } else if (isErsUrl(document.referrer)) {
              persistReturnUrl(document.referrer);
            }

            if (window.opener && !window.opener.closed) {
              markOpenedAsErsPopup();
            }
          }
          return;
        }

        if (!cancelled && result.reason === "handoff_failed") {
          alert("無法載入病患資料，請關閉視窗後由急診系統重新開啟");
        }
      } catch {
        if (!cancelled) {
          alert("無法載入病患資料，請關閉視窗後由急診系統重新開啟");
        }
      }
    };

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const emptyVitals = {
    bp_s: "", bp_d: "", pr: "", rr: "", bt: "", bw: "", 疼痛評估: ""
  };
  const [vitals, setVitals] = useState(emptyVitals);
  const [vitalsLoaded, setVitalsLoaded] = useState(false);
  const histno = pickSessionValue(session, ["病歷號", "PHISTNUM", "HISTNO", "histno"]);
  const caseno = pickSessionValue(session, [
    "ERS就診序號API",
    "ERS就診序號",
    "就診號",
    "PCASENO",
    "CASENO",
    "PVISITNO",
    "caseno",
  ]);
  const docid = pickSessionValue(session, [
    "醫生ID",
    "醫師ID",
    "PDOCID",
    "DOCID",
    "PDOCTOR",
    "docid",
  ]);
  const hasExternalVitals = Boolean(
    session?.vitals && typeof session.vitals === "object"
  );
  const hasExternalMedical = Boolean(
    session?.medicalInfo && typeof session.medicalInfo === "object"
  );

  const [resolvedVisit, setResolvedVisit] = useState<{
    caseno?: string;
  }>({});

  const effectiveCaseno = resolvedVisit.caseno || normalizeErcaseno(caseno);
  const displayCaseno = displayErcaseno(effectiveCaseno) || caseno;

  useEffect(() => {
    if (!histno || !caseno) return;

    resolveErVisitAction(histno, caseno).then((result) => {
      if (!result.success) return;
      setResolvedVisit({
        caseno: result.ercaseno || (result.erttbkey ? normalizeErcaseno(result.erttbkey) : undefined),
      });
    });
  }, [histno, caseno]);

  useEffect(() => {
    async function fetchData() {
      if (hasExternalVitals) {
        setVitalsLoaded(true);
        return;
      }

      setVitalsLoaded(false);
      if (histno && displayCaseno) {
        const result = await getVitalSigns(histno, displayCaseno);
        if (result.success && result.data) {
          setVitals(result.data);
        }
      }
      setVitalsLoaded(true);
    }
    fetchData();
  }, [histno, displayCaseno, hasExternalVitals]);

  const handleVitalsChange = (
    field: keyof Omit<typeof emptyVitals, '疼痛評估'>,
    value: string
  ) => {
    setVitals((prev) => ({ ...prev, [field]: value }));
  };

  const [isRightVisible, setIsRightVisible] = useState(false);
  const [isLeftVisible, setIsLeftVisible] = useState(true);
  const [medicalData, setMedicalData] = useState<ModelItem>(ModelValue);
  const [medicalInfo, setMedicalInfo] = useState<ModelItemPrint>(ModelPrintValue);
  const [title, setTitle] = useState("");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!session) return;

    const externalMedical = session.medicalInfo as ExternalSessionMedicalInfo | undefined;
    if (externalMedical && typeof externalMedical === "object") {
      setMedicalInfo((prev) => ({
        ...prev,
        chiefComplaint:
          externalMedical.chiefComplaint !== undefined
            ? externalMedical.chiefComplaint
            : prev.chiefComplaint,
        presentIllness:
          externalMedical.presentIllness !== undefined
            ? externalMedical.presentIllness
            : prev.presentIllness,
        pastHistory:
          externalMedical.pastHistory !== undefined
            ? externalMedical.pastHistory
            : prev.pastHistory,
        generalCondition:
          externalMedical.generalCondition !== undefined
            ? externalMedical.generalCondition
            : prev.generalCondition,
        heent: externalMedical.heent !== undefined ? externalMedical.heent : prev.heent,
        neck: externalMedical.neck !== undefined ? externalMedical.neck : prev.neck,
        chestAndLungs:
          externalMedical.chestAndLungs !== undefined
            ? externalMedical.chestAndLungs
            : prev.chestAndLungs,
        abdomen:
          externalMedical.abdomen !== undefined ? externalMedical.abdomen : prev.abdomen,
        backAndSpine:
          externalMedical.backAndSpine !== undefined
            ? externalMedical.backAndSpine
            : prev.backAndSpine,
        exogenitalia:
          externalMedical.exogenitalia !== undefined
            ? externalMedical.exogenitalia
            : prev.exogenitalia,
        rectalExam:
          externalMedical.rectalExam !== undefined
            ? externalMedical.rectalExam
            : prev.rectalExam,
        extremities:
          externalMedical.extremities !== undefined
            ? externalMedical.extremities
            : prev.extremities,
        neurologicalExam:
          externalMedical.neurologicalExam !== undefined
            ? externalMedical.neurologicalExam
            : prev.neurologicalExam,
        icdList: Array.isArray(externalMedical.icdList)
          ? externalMedical.icdList
          : prev.icdList ?? [],
        icd: externalMedical.icd ?? prev.icd,
      }));
    }

    const externalVitals = session.vitals as ExternalSessionVitals | undefined;
    if (externalVitals && typeof externalVitals === "object") {
      setVitals({
        bp_s: externalVitals.bp_s ?? "",
        bp_d: externalVitals.bp_d ?? "",
        bt: externalVitals.bt ?? "",
        pr: externalVitals.pr ?? "",
        bw: externalVitals.bw ?? "",
        rr: externalVitals.rr ?? "",
        疼痛評估: externalVitals.painAssessment ?? "",
      });
      setVitalsLoaded(true);
    }
  }, [session]);

  const [activeTab, setActiveTab] = useState("");
  const [aiPredictTrigger, setAiPredictTrigger] = useState(0);
  const [chelf, setChelf] = useState(0);
  const [pastHistoryImport, setPastHistoryImport] = useState<{
    key: number;
    text: string;
  } | null>(null);
  const hasChiefComplaint = Boolean(medicalInfo.chiefComplaint?.trim());
  const templateName =
    medicalInfo.name?.trim() ||
    (typeof (medicalInfo as { 名稱?: string })["名稱"] === "string"
      ? (medicalInfo as { 名稱?: string })["名稱"]?.trim()
      : "");
  const hasTemplate = Boolean(templateName || title?.trim());

  const canSaveWithoutIcdPath = hasChiefComplaint || hasTemplate;

  const sexRaw = pickSessionValue(session, ["性別", "PSEX", "SEX"]);
  const sex = sexRaw === "1" || sexRaw.toUpperCase() === "M" ? "男" : sexRaw ? "女" : "";
  const birthRaw = pickSessionValue(session, ["生日", "PBIRTHDT", "BIRTHDAY", "DOB"]);
  const birthDigits = birthRaw.replace(/\D/g, "").slice(0, 8);
  const age = birthDigits.length === 8 ? calculateAge(birthDigits) : "";
  const closeAllHistoryRef = useRef<(() => void) | null>(null);
  const medicalFormRef = useRef<MedicalFormHandle>(null);
  const wordPatientInfo = session
    ? {
        name: pickSessionValue(session, ["病患姓名", "姓名", "PNAME", "NAME"]),
        idNo: pickSessionValue(session, ["身分證字號", "PIDNO", "IDNO"]),
        sex,
        birthDate: birthDigits,
        histno: String(histno ?? ""),
      }
    : undefined;
  const wordAdmissionMeta = useMemo(
    () => buildWordAdmissionMeta(session),
    [session]
  );

  const handleIcdAiSuggest = () => {
    if (!hasChiefComplaint) {
      alert("請先填寫主述 CHIEF COMPLAINT");
      return;
    }
    setIsIcdSectionExpanded(true);
    setIsRightVisible(true);
    setAiPredictTrigger((p) => p + 1);
  };

  const persistMedicalDraft = (info: ModelItemPrint) => {
    if (!histno || !caseno) return;
    try {
      localStorage.setItem(
        medicalDraftKey(histno, caseno),
        JSON.stringify({ medicalInfo: info, savedAt: Date.now() })
      );
    } catch {
      /* ignore quota / private mode */
    }
  };

  const handleSave = async () => {
    if (!medicalFormRef.current?.validateFieldLengths()) {
      return;
    }

    const hasIcd =
      Boolean(medicalInfo.icd?.id?.trim()) ||
      (Array.isArray(medicalInfo.icdList) &&
        medicalInfo.icdList.some((item) => item.id?.trim()));
    if (!hasIcd) {
      const userConfirmed = confirm("尚未填寫 ICD 是否由AI判斷? (需先填寫完整病患資訊)");
      if (userConfirmed) {
        if (!canSaveWithoutIcdPath) {
          alert("請填寫主述 CHIEF COMPLAINT，或選擇模板後再送出");
          return;
        }

        setIsRightVisible(true);
        setAiPredictTrigger((p) => p + 1);
        return;
      }
      return;
    }
    if (!canSaveWithoutIcdPath) {
      alert("請填寫主述 CHIEF COMPLAINT，或選擇模板後再儲存");
      return;
    }
    if (!histno || !effectiveCaseno || !docid) return;

    const payload = buildMedicalPayload(
      medicalInfo,
      histno,
      effectiveCaseno,
      docid,
      vitals.疼痛評估
    );
    persistMedicalDraft({
      ...medicalInfo,
      icdList: payload.icdList,
      icd: payload.icdList[0] ?? medicalInfo.icd,
    });

    if (DEMO_HOSPITAL_INTEGRATION_DISABLED) {
      setShowToast(true);
      window.setTimeout(() => setShowToast(false), 1200);
      return;
    }

    const result = await saveMedicalRecord(payload);
    if (!result.success) {
      alert(result.message || "資料儲存失敗");
      return;
    }

    setShowToast(true);
    window.setTimeout(() => {
      setShowToast(false);
      closeAppWindowAfterSave();
    }, 1200);
  };

  // const viewJson = async () => {
  //   if (!histno || !effectiveCaseno || !docid) return;
  //   const formattedData = buildMedicalPayload(
  //     medicalInfo,
  //     histno,
  //     effectiveCaseno,
  //     docid,
  //     vitals.疼痛評估
  //   );
  //   await saveMedicalRecord(formattedData);
  //   const jsonString = JSON.stringify(formattedData, null, 2);
  //   const blob = new Blob([jsonString], { type: "application/json" });
  //   const url = URL.createObjectURL(blob);
  //   window.open(url, "_blank");
  // };

  const handleICDSelect = (selectedList: ICDItem[]) => {
    const primary = selectedList[0] || { id: "", zhName: "", enName: "", use: 0 };
    setMedicalInfo((prev) => ({
      ...prev,
      icdList: selectedList,
      icd: {
        id: primary.id || "",
        zhName: primary.zhName || "",
        enName: primary.enName || "",
        use: primary.use || 0,
      },
    }));
  };

  useEffect(() => {
    if (!histno || !caseno || hasExternalMedical) return;
    try {
      const raw = localStorage.getItem(medicalDraftKey(histno, caseno));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { medicalInfo?: ModelItemPrint };
      const draft = parsed.medicalInfo;
      if (!draft) return;
      setMedicalInfo((prev) => ({
        ...prev,
        ...draft,
        icdList: Array.isArray(draft.icdList) ? draft.icdList : prev.icdList ?? [],
        icd: draft.icd ?? prev.icd,
      }));
    } catch {
      /* ignore corrupt draft */
    }
  }, [histno, caseno, hasExternalMedical]);

  const [spData, setSpData] = useState<SpPayload | null>(null);
  const [spHistoryLoading, setSpHistoryLoading] = useState(false);

  useEffect(() => {
    if (!histno || !docid) return;

    let cancelled = false;
    setSpHistoryLoading(true);

    getProcedureData(histno, docid)
      .then((result) => {
        if (!cancelled && "success" in result && result.success && result.data) {
          setSpData(result.data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("載入過去病歷失敗", err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSpHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [histno, docid]);

  useEffect(() => {
    if (!histno || !caseno || hasExternalMedical) return;

    getErMedicalRecordAction(histno, caseno).then((result) => {
      if (!result.success || !result.data) return;

      const record = result.data;
      setMedicalInfo((prev) => ({
        ...prev,
        chiefComplaint: record.erdia01 || prev.chiefComplaint,
        presentIllness: record.erdia04 || prev.presentIllness,
        pastHistory: record.erdia08 || prev.pastHistory,
        generalCondition: record.erdib01 || prev.generalCondition,
        heent: record.erdib03 || prev.heent,
        neck: record.erdib04 || prev.neck,
        chestAndLungs: record.erdib05 || prev.chestAndLungs,
        abdomen: record.erdib07 || prev.abdomen,
        backAndSpine: record.erdib09 || prev.backAndSpine,
        exogenitalia: record.erdib10 || prev.exogenitalia,
        rectalExam: record.erdib11 || prev.rectalExam,
        extremities: record.erdib12 || prev.extremities,
        neurologicalExam: record.erdib13 || prev.neurologicalExam,
      }));
    });
  }, [histno, caseno, hasExternalMedical]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePromptType, setActivePromptType] = useState<string | null>(null);
  const [isWhisperModalOpen, setIsWhisperModalOpen] = useState(false);
  const [whisperTranscript, setWhisperTranscript] = useState("");
  const [whisperSummary, setWhisperSummary] = useState("");
  const [icdSearchKeyword, setIcdSearchKeyword] = useState<string | null>(null);
  const [isHistorySectionExpanded, setIsHistorySectionExpanded] = useState(true);
  const [isIcdSectionExpanded, setIsIcdSectionExpanded] = useState(true);

  const toggleHistorySection = () => setIsHistorySectionExpanded((v) => !v);
  const toggleIcdSection = () => setIsIcdSectionExpanded((v) => !v);

  useEffect(() => {
    if (icdSearchKeyword) {
      setIsLeftVisible(true);
      setIsIcdSectionExpanded(true);
    }
  }, [icdSearchKeyword]);

  if (!session) {
    return (
      <div className={styles.container} style={{ padding: 24 }}>
        載入病患資料中…
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${isDarkMode ? styles.dark : ""}`}>
      
      {showToast && (
        <div className={styles.customToast}>
          <div className={styles.toastContent}>
            儲存成功，即將返回 ERS…
          </div>
        </div>
      )}
      <header className={styles.patientHeader}>
        <div className={styles.patientInfo}>
          <div  className={styles.patientInf}>
            <span className={styles.patientName}>
              陳家豪
            </span>
            <span className={styles.patientAge}><p>性別:</p> {sex}</span>
                        <span className={styles.patientAge}><p>年齡:{age}</p></span>
            <span className={styles.patientAge}><p>病患ID:</p> {histno}</span>
            <span className={styles.patientAge}><p>就診號:</p> {displayCaseno}</span>
            <span className={styles.patientAge}><p>醫師ID:</p>{docid}</span>
          </div>
          <div className={styles.tabNavigation}>  

            <div className={styles.leftGroup}>
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className={styles.tabSelect}
              >
                <option value="">{ title ?`當前模板: ${title}` : "選擇模板" }</option>
                <option value="內">demo: 內科</option>
              </select>
              <button
                className={styles.toggleBtn}
                onClick={() => setIsLeftVisible(!isLeftVisible)}
              >
                {isLeftVisible ? <><FaChevronLeft /> 收起左側欄</> : <><FaChevronRight /> 展開左側欄</>}
              </button>   
              {/* <button onClick={handleEdit}>更新模板</button> */}
              <button
                className={styles.toggleBtn}
                onClick={() => setIsRightVisible(!isRightVisible)}
                >
                {isRightVisible ? <>收起AI助手 <FaChevronRight /></> : <>展開AI助手 <FaChevronLeft /></>}
              </button>
              <button
                className={styles.toggleBtn}
                onClick={() => setIsWhisperModalOpen(true)}
              >
                Whisper
              </button>

              <button onClick={handleSave}>儲存病患資料</button>
              <button onClick={toggleDarkMode}>
                {isDarkMode ? "夜間模式" : "日間模式"}
              </button>
            </div>    
          </div>  
        </div>
      </header>

      <main className={styles.mainContent}>
        <aside
          className={[
            styles.left,
            !isLeftVisible ? styles.collapsed : "",
            isHistorySectionExpanded && isIcdSectionExpanded
              ? styles.leftBothExpanded
              : isHistorySectionExpanded
                ? styles.leftOnlyHistoryExpanded
                : isIcdSectionExpanded
                  ? styles.leftOnlyIcdExpanded
                  : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div
            className={[
              styles.leftSection,
              styles.leftSectionHistory,
              isHistorySectionExpanded
                ? styles.leftSectionExpanded
                : styles.leftSectionCollapsed,
            ].join(" ")}
          >
            <div
              className={styles.historyHeader}
              onClick={toggleHistorySection}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleHistorySection();
                }
              }}
            >
              <span>
                {spHistoryLoading
                  ? "過去病歷 / 過敏資訊 - 載入中..."
                  : "過去病歷 / 過敏資訊"}
              </span>
              <div
                className={styles.historyHeaderActions}
                onClick={(e) => e.stopPropagation()}
              >
                {isHistorySectionExpanded && (
                  <button
                    type="button"
                    onClick={() => closeAllHistoryRef.current?.()}
                  >
                    收起內容
                  </button>
                )}
                <button type="button" onClick={toggleHistorySection}>
                  {isHistorySectionExpanded ? "收起功能" : "展開功能"}
                </button>
              </div>
            </div>
            <div
              className={[
                styles.leftSectionPanel,
                isHistorySectionExpanded ? styles.leftSectionPanelOpen : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={styles.leftSectionPanelInner}>
                <div className={styles.leftSectionBody}>
                  <HistoryItems
                    spData={spData}
                    loading={spHistoryLoading}
                    hideTitle
                    onCloseAllReady={(fn) => {
                      closeAllHistoryRef.current = fn;
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div // 左側style寫法
            className={[
              styles.leftSection,
              styles.leftSectionIcd,
              isIcdSectionExpanded
                ? styles.leftSectionExpanded
                : styles.leftSectionCollapsed,
            ].join(" ")}
          >
            <div
              className={styles.historyHeader}
              onClick={toggleIcdSection}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleIcdSection();
                }
              }}
            >
              <span>ICD10 模糊搜尋</span>
              <div
                className={styles.historyHeaderActions}
                onClick={(e) => e.stopPropagation()}
              >
                {isIcdSectionExpanded && (
                  <button type="button" onClick={handleIcdAiSuggest}>
                    ICD10 AI診斷建議
                  </button>
                )}
                <button type="button" onClick={toggleIcdSection}>
                  {isIcdSectionExpanded ? "收起功能" : "展開功能"}
                </button>
              </div>
            </div>
            <div
              className={[
                styles.leftSectionPanel,
                isIcdSectionExpanded ? styles.leftSectionPanelOpen : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={styles.leftSectionPanelInner}>
                <div className={styles.leftSectionBody}>
                  <ICDSearch
                    handleICDSelect={handleICDSelect}
                    initialSelected={medicalInfo.icdList ?? EMPTY_ICD_LIST}
                    externalSearchKeyword={icdSearchKeyword}
                    onExternalSearchConsumed={() => setIcdSearchKeyword(null)}
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className={styles.rightPanel}>
          <MedicalForm
            ref={medicalFormRef}
            // setIsLeftVisible={setIsLeftVisible}
            // isLeftVisible={isLeftVisible}
            setIsRightVisible={setIsRightVisible}
            setMedicalData={setMedicalData}
            vitals={vitals}
            vitalsLoaded={vitalsLoaded}
            onVitalsChange={handleVitalsChange}

            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setTitle={setTitle}
            setMedicalInfo={setMedicalInfo}
            medicalInfo={medicalInfo}
            setChelf={setChelf}
            pastHistoryImport={pastHistoryImport}
          />
        </section>
        <aside className={`${styles.rightCollapsePanel} ${isRightVisible ? styles.expanded : ""}`}>
          <AI
            medicalData={medicalData}
            aiPredictTrigger={aiPredictTrigger}
            medicalInfo={medicalInfo}
            spData={spData}
            chelf={chelf}
            docid={docid}
            histno={histno}
            caseno={effectiveCaseno}
            patientSex={sex}
            patientAge={age}
            activePromptType={activePromptType}
            onIcdQuery={(keyword) => setIcdSearchKeyword(keyword)}
            onApplyPastHistory={(text) =>
              setPastHistoryImport({ key: Date.now(), text })
            }
            wordPatientInfo={wordPatientInfo}
            wordAdmissionMeta={wordAdmissionMeta}
          />
        </aside>
      </main>

      {isWhisperModalOpen && (
        <div className={styles.modalOverlay}>
          <MedicalAsr
            setIsWhisperModalOpen={setIsWhisperModalOpen}
            docid={docid}
            histno={histno}
            caseno={effectiveCaseno}
            transcript={whisperTranscript}
            setTranscript={setWhisperTranscript}
            summary={whisperSummary}
            setSummary={setWhisperSummary}
          />
        </div>
      )}
    </div>
  );
}
