import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import styles from '@/styles/components/MedicalForm.module.scss';

import { sections} from '@/lib/data/data';
import {ModelItem,ModelValue,ModelItemPrint} from "@/lib/data/modelData";
import TraumaModal from '@/components/TraumaModal';
import Alert from './Layout/Alert';
import CharCountTextarea from '@/components/CharCountTextarea';
import { getModelListAction } from "@/app/actions/modelActions";
import { useTheme } from "@/context/ThemeContext";
import VitalSignsSection, { type VitalData } from './VitalSignsSection';
import {
  MEDICAL_TEXT_FIELDS,
  clampMedicalFieldText,
  getFieldCharLimit,
  normalizeMedicalFieldText,
  type MedicalTextFieldKey,
} from '@/lib/constants/fieldLimits';
import { buildChiefComplaintWithPain } from '@/lib/utils/buildChiefComplaintWithPain';
import {
  buildToccDisplayText,
  INITIAL_TOCC_STATUSES,
  mergeToccNotes,
  mergeToccStatuses,
  parsePastHistoryForTocc,
  TOCC_KEYS,
  TOCC_LABELS,
  type ToccKey,
  type ToccNotes,
  type ToccStatuses,
} from '@/lib/utils/toccHistory';

interface Props {
  setIsRightVisible: (e: boolean) => void;
  setMedicalData: (e: ModelItem) => void;
  activeTab:string;
  setActiveTab:(e:string)=> void;
  setTitle:(e:string)=> void;
  setMedicalInfo: Dispatch<SetStateAction<ModelItemPrint>>;
  medicalInfo: ModelItemPrint;
  setChelf:(e:any)=>void;
  vitals: VitalData;
  vitalsLoaded: boolean;
  onVitalsChange: (field: keyof Omit<VitalData, '疼痛評估'>, value: string) => void;
  pastHistoryImport?: { key: number; text: string } | null;
}

export interface MedicalFormHandle {
  validateFieldLengths: () => boolean;
}

const MedicalForm = forwardRef<MedicalFormHandle, Props>(function MedicalForm({
  setIsRightVisible,
  setMedicalData,
  activeTab,
  setActiveTab,
  setTitle,
  setMedicalInfo,
  medicalInfo,
  setChelf,

  vitals,
  vitalsLoaded,
  onVitalsChange,
  pastHistoryImport,
}, ref) {
    const { isDarkMode } = useTheme();
    const [data, setData] = useState<ModelItem[]>([]);
    const [form, setForm] = useState<ModelItem>(ModelValue);
    const [showMessage, setShowMessage] = useState(false);
    const fieldSectionRefs = useRef<Partial<Record<MedicalTextFieldKey, HTMLDivElement | null>>>({});

    /* ================= 抓模板 ================= */
    useEffect(() => {
      const fetchData = async () => {
        try {
          const res = await getModelListAction();
          setData(res);
        } catch (err) {
          console.error("抓取失敗", err);
        }
      };
      fetchData();
    }, []);

    // 院方 / session 預填寫入表單（CHIEF COMPLAINT、PRESENT ILLNESS 等顯示在 form state）
    useEffect(() => {
      setForm((prev) => {
        const next = { ...prev };
        let changed = false;

        for (const { key } of MEDICAL_TEXT_FIELDS) {
          const imported = medicalInfo[key];
          if (typeof imported !== "string" || !imported.trim()) continue;
          if (imported !== prev[key]) {
            next[key] = imported;
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, [medicalInfo]);

    useEffect(() => {
      setMedicalInfo((prev) => {
        const hasIcd =
          prev.icd &&
          (String(prev.icd.id ?? "").trim() !== "" ||
            String(prev.icd.zhName ?? "").trim() !== "");
        const hasIcdList =
          Array.isArray(prev.icdList) &&
          prev.icdList.some(
            (item) => String(item?.id ?? "").trim() !== ""
          );

        const next: ModelItemPrint = { ...prev };

        for (const { key } of MEDICAL_TEXT_FIELDS) {
          const formVal = normalizeMedicalFieldText(form[key]);
          if (formVal) {
            next[key] = clampMedicalFieldText(formVal, key);
          }
        }

        next.name = form.name || prev.name;
        next.department = form.department || prev.department;
        next.ersbkey = form.ersbkey ?? prev.ersbkey;
        next.doctorId = form.doctorId || prev.doctorId;

        return {
          ...next,
          icd: hasIcd ? prev.icd : { id: "", zhName: "", enName: "", use: 0 },
          icdList: hasIcdList ? prev.icdList : prev.icdList ?? [],
        };
      });
    }, [form, setMedicalInfo]);

    const filtered = useMemo(() => {
      return data.filter((d: any) => d.department?.includes(activeTab));
    }, [data, activeTab]);

    /* ================= Modal 選擇 ================= */
    const handleSelectFromModal = (item: ModelItem) => {
      const cleanedItem = Object.keys(item).reduce((acc, key) => {
        const value = item[key as keyof ModelItem];
        acc[key] =
          typeof value === 'string'
            ? normalizeMedicalFieldText(value)
            : value;
        return acc;
      }, {} as ModelItem);

      const { generalText, toccNotes, toccStatuses: importedStatuses } =
        parsePastHistoryForTocc(cleanedItem.pastHistory ?? '');

      setTitle(item['名稱'] || item['name']);
      applyTemplate({ ...cleanedItem, pastHistory: generalText });

      if (Object.keys(toccNotes).length > 0) {
        setToccTemplateNotes((prev) => mergeToccNotes(prev, toccNotes));
      }
      if (Object.keys(importedStatuses).length > 0) {
        setToccStatuses((prev) => mergeToccStatuses(prev, importedStatuses));
      }

    };

    const applyTemplate = (templateData: ModelItem) => {
      const medicalKeys: MedicalTextFieldKey[] = [
        "chiefComplaint", "presentIllness", "pastHistory", 
        "generalCondition", "chestAndLungs", "abdomen", 
        "heent", "neck", "backAndSpine", 
        "exogenitalia", "rectalExam", "extremities", "neurologicalExam"
      ];

      setForm((prevForm) => {
        const mergeContent = (original: unknown, template: unknown, key: MedicalTextFieldKey) => {
          const o = normalizeMedicalFieldText(original);
          const t = normalizeMedicalFieldText(template);
          if (!o) return clampMedicalFieldText(t, key);
          if (!t) return o;
          if (o === t) return o;
          return clampMedicalFieldText(`${o}\n${t}`, key);
        };

        const updatedForm = { ...prevForm };

        medicalKeys.forEach((key) => {
          if (key in templateData) {
            (updatedForm as ModelItem)[key] = mergeContent(
              (prevForm as ModelItem)[key],
              (templateData as ModelItem)[key],
              key
            );
          }
        });

        return updatedForm;
      });
    };
    /* ================= AI ================= */
    const handleAskAi = () => {
      setMedicalData(form);
      setChelf((p:number) => p + 1)
      setIsRightVisible(true);
    };  
    
    useEffect(()=>{
      setMedicalData(form)
    },[form])
    /* ================= Past History / TOCC ================= */
    const [toccStatuses, setToccStatuses] = useState<ToccStatuses>(INITIAL_TOCC_STATUSES);
    const [toccTemplateNotes, setToccTemplateNotes] = useState<ToccNotes>({});

    const cycleTocc = (key: ToccKey) => {
      setToccStatuses((prev) => ({
        ...prev,
        [key]: ((prev[key] ?? 0) + 1) % 3,
      }));
    };

    const toccDisplayText = useMemo(
      () => buildToccDisplayText(toccStatuses, toccTemplateNotes),
      [toccStatuses, toccTemplateNotes]
    );

    const btnText = (label: string, status: number) =>
      status === 1 ? `${label}(+)` : status === 2 ? `${label}(-)` : label;
    const btnClass = (status: number) =>
      status === 1 ? styles.redButton : status === 2 ? styles.blueButton : '';

    const mergePastHistory = (original: string, incoming: string) => {
      const o = normalizeMedicalFieldText(original);
      const t = normalizeMedicalFieldText(incoming);
      if (!o) return clampMedicalFieldText(t, 'pastHistory');
      if (!t) return o;
      if (o === t) return o;
      return clampMedicalFieldText(`${o}\n${t}`, 'pastHistory');
    };

    useEffect(() => {
      if (!pastHistoryImport?.text) return;
      const { generalText, toccNotes, toccStatuses: importedStatuses } =
        parsePastHistoryForTocc(pastHistoryImport.text);
      setForm((prev) => ({
        ...prev,
        pastHistory: mergePastHistory(prev.pastHistory ?? '', generalText),
      }));
      if (Object.keys(toccNotes).length > 0) {
        setToccTemplateNotes((prev) => mergeToccNotes(prev, toccNotes));
      }
      if (Object.keys(importedStatuses).length > 0) {
        setToccStatuses((prev) => mergeToccStatuses(prev, importedStatuses));
      }

    }, [pastHistoryImport?.key]);

    useImperativeHandle(ref, () => ({
      validateFieldLengths: () => {
        for (const { key, label } of MEDICAL_TEXT_FIELDS) {
          const rawValue = String((form as ModelItem)[key] ?? '');
          const value =
            key === 'chiefComplaint'
              ? buildChiefComplaintWithPain(rawValue, vitals.疼痛評估)
              : rawValue;
          const limit = getFieldCharLimit(key);
          if (value.length > limit) {
            fieldSectionRefs.current[key]?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
            alert(`「${label}」欄位超過 ${limit} 字（目前 ${value.length} 字），請縮短內容後再儲存`);
            return false;
          }
        }
        return true;
      },
    }), [form, vitals.疼痛評估]);

    /* ================= UI ================= */
    return (
      <div className={`${styles.container} ${isDarkMode ? styles.dark : ''}`}>  

        {/* ================= 表單 ================= */}
        <div className={styles.medicalForm}>    
          {/* Chief Complaint */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>CHIEF COMPLAINT</div>
            <div className={styles.sectionContent}>
              <CharCountTextarea
                rows={4}
                fieldKey="chiefComplaint"
                value={form?.chiefComplaint ?? ''}
                onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                sectionRef={(el) => { fieldSectionRefs.current.chiefComplaint = el; }}
              />
              <div className={styles.complaintInfo}>
                <button onClick={handleAskAi}>主敘AI推論</button>
                <div className={styles.painAssessment}>疼痛評估: {vitals.疼痛評估}</div>
              </div>
            </div>
          </div>    
          {/* Present Illness */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>PRESENT ILLNESS</div>
            <div className={styles.sectionContent}>
              <CharCountTextarea
                rows={4}
                fieldKey="presentIllness"
                value={form?.presentIllness ?? ''}
                onChange={(e) => setForm({ ...form, presentIllness: e.target.value })}
                sectionRef={(el) => { fieldSectionRefs.current.presentIllness = el; }}
              />
            </div>
          </div>    
          {/* Past History */}
          <div className={styles.formSectionP}>
          <div className={styles.sectionHeader}>PAST HISTORY</div>
          <div className={styles.sectionContent}>

            <CharCountTextarea
              rows={5}
              fieldKey="pastHistory"
              value={form?.pastHistory ?? ''}
              onChange={(e) => setForm({ ...form, pastHistory: e.target.value })}
              sectionRef={(el) => { fieldSectionRefs.current.pastHistory = el; }}
            />

            {TOCC_KEYS.map((key, i) => {
              const label = TOCC_LABELS[i];
              const state = toccStatuses[key];

              return (
                <button
                  key={key}
                  type="button"
                  className={btnClass(state)}
                  onClick={() => cycleTocc(key)}
                  style={{marginRight:"5px"}}
                >
                  {btnText(label, state)}
                </button>
              );
            })}

            <textarea
              rows={1}
              readOnly
              className={styles.inputField}
              style={{marginTop:"5px"}}
              value={toccDisplayText}
              placeholder=""
            />
          </div>
          </div>
          {/* VITAL SIGNS */}
          <VitalSignsSection
            vitals={vitals}
            vitalsLoaded={vitalsLoaded}
            onVitalsChange={onVitalsChange}
          />


          {/* 其他 sections */}
          {sections.map((v,i) => (
          <div className={styles.formSection} key={i}>
            <div className={styles.sectionHeader}>{v.label}</div>
            <div className={styles.sectionContent}>
              <CharCountTextarea
                rows={3}
                fieldKey={v.key as MedicalTextFieldKey}
                value={form?.[v.key] || ''}
                onChange={(e) => setForm({ ...form, [v.key]: e.target.value })}
                sectionRef={(el) => {
                  fieldSectionRefs.current[v.key as MedicalTextFieldKey] = el;
                }}
              />
            </div>
          </div>
          ))}   
        </div>  
        {/* Modal */}
        {activeTab && (
          <TraumaModal
            closeModal={() => setActiveTab('')}
            tab={activeTab}
            onSelect={handleSelectFromModal}
            data={filtered}
          />
        )}  
        {/* Alert */}
        {showMessage && (
          <Alert
            main="修改成功"
            isConfirm={false}
            onCancel={() => setShowMessage(false)}
          />
        )}  
      </div>
    );
});

export default MedicalForm;