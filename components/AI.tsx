/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import styles from '@/styles/components/AI.module.scss';
import { FaPaperPlane, FaThumbsUp, FaThumbsDown, FaStar } from 'react-icons/fa';
import Alert from './Layout/Alert';
import { ModelValue, ModelItemPrint } from '@/lib/data/modelData';
import { SpPayload } from '@/lib/data/spData';
import { chatWithAiAction } from '@/app/actions/aiActions';
import {generateAIResponse} from '@/app/actions/formalAiActions'
import { logAiFeatureUsage } from '@/app/actions/analyticsActions'
import {
  buildAiMessageWithPatient,
  buildPatientSystemPrompt,
} from '@/lib/utils/buildAiPatientContext';
import { AIItem, AITriggerType, formatItemsByTrigger, stripListIndexPrefix, triggerDisplayMap } from '../lib/utils/aiFormatters';
import { submitFeedback, submitAiDownvote } from '@/app/actions/feedbackAction'
import { downloadAiResponseAsWord, WordPatientInfo } from '@/lib/utils/downloadAiWord';
import { WordAdmissionMeta } from '@/lib/utils/buildWordAdmissionInfo';
import { extractIcdCodeFromText } from '@/lib/utils/extractIcdCode';
import { copyToClipboard } from '@/lib/utils/copyToClipboard';
import { renderAiBoldText } from '@/lib/utils/renderAiBoldText';
import { useTheme } from '@/context/ThemeContext';
import { logAiResponse } from '@/lib/utils/logAiResponse';

interface Message {
  role: 'user' | 'ai';
  text: string;
  items?: AIItem[];
  triggerType?: AITriggerType;
  triggerLabel?: string;
}
interface Props {
  medicalData: typeof ModelValue;
  aiPredictTrigger: number;
  medicalInfo: ModelItemPrint;
  spData: SpPayload | null;
  chelf: number;
  activePromptType:string | null;
  docid:string;
  histno?: string;
  caseno?: string;
  patientSex: string;
  patientAge: string | number;
  onIcdQuery?: (keyword: string) => void;
  onApplyPastHistory?: (text: string) => void;
  wordPatientInfo?: WordPatientInfo;
  wordAdmissionMeta?: WordAdmissionMeta;
}
type DataSource = 'Default' | 'Local';
type ConfigItem = { prompt: string; data: any; label: string };
type PromptType = string;

export default function AI({
  activePromptType,
  medicalData,
  aiPredictTrigger,
  spData,
  chelf,
  docid,
  histno,
  caseno,
  patientSex,
  patientAge,
  onIcdQuery,
  onApplyPastHistory,
  wordPatientInfo,
  wordAdmissionMeta,
}: Props) {

  const { isDarkMode } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: '你好！我是您的醫療 AI 助手，已準備好分析病歷資料。請問有什麼我可以幫您的？' }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMessageR, setShowMessageR] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const prevLoadingRef = useRef(false);
  const [sourceMode, setSourceMode] = useState<DataSource>('Default');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("複製成功");
  const [selectedRating, setSelectedRating] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [messageReactions, setMessageReactions] = useState<Record<number, 'up' | 'down'>>({});
  const [downvotingIndex, setDownvotingIndex] = useState<number | null>(null);


  const lastAnalyzedRef = useRef("");
  const patientDemographics = { sex: patientSex, age: patientAge };

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInputValue("");

    try {
      const result = await chatWithAiAction(
        trimmed,
        buildPatientSystemPrompt(patientDemographics)
      );
      logAiResponse("AI/handleSendMessage", result);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: result.success
            ? result.items?.length
              ? ""
              : result.text || "未取得 AI 回覆。"
            : "未取得 AI 回覆。",
          items: result.items,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "連線失敗，請稍後再試。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const countChanged = messages.length !== prevMessageCountRef.current;
    const loadingChanged = loading !== prevLoadingRef.current;
    prevMessageCountRef.current = messages.length;
    prevLoadingRef.current = loading;
    if ((countChanged || loadingChanged) && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // 主訴觸發
  useEffect(() => {
    const complaint = medicalData?.chiefComplaint;
    if (complaint) {
      lastAnalyzedRef.current = complaint;
      sendToAI(
        `主敘AI推論`,
        `${sourceMode === 'Local' ? "Local-Diagnosis-Chief complaint" : "Diagnosis-Chief complaint"}`,
        medicalData.chiefComplaint,
        'chiefComplaint'
      );
    }
  }, [chelf]);

  // 發送AI API
  const sendToAI = useCallback(async (
    label: string,
    promptType: string,
    contextData: any,
    triggerType: AITriggerType
  ) => {
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: label, triggerType, triggerLabel: triggerDisplayMap[triggerType] }]);

    void logAiFeatureUsage({
      docid,
      histno,
      caseno,
      featureType: triggerType,
      sourceMode,
    });
    
    try {
      const result = await generateAIResponse(
        buildAiMessageWithPatient(contextData, patientDemographics),
        promptType,
        { docid, histno, caseno, featureType: triggerType, sourceMode }
      );

      if (!result.success) {
        setMessages(prev => [...prev, { role: 'ai', text: result.message || "AI 服務呼叫失敗" }]);
        return;
      }

      const data = result.output;
      logAiResponse(`AI/sendToAI/${triggerType}`, data);
      
      if (!data) {
        setMessages(prev => [...prev, { role: 'ai', text: "分析完成，未回傳內容。" }]);
        return;
      }
      
      const items = formatItemsByTrigger(triggerType, data);
      
      setMessages(prev => [...prev, {
        role: 'ai',
        text: '',
        items,
        triggerType,
        triggerLabel: triggerDisplayMap[triggerType]
      }]);

    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "自動分析失敗，請檢查網路連線。" }]);
    } finally {
      setLoading(false);
    }
  }, [patientSex, patientAge, docid, histno, caseno, sourceMode]);

  // 切換聊天視窗中各項目選項的選取狀態 (Checked/Unchecked)
  const handleToggleItem = (msgIndex: number, groupIndex: number, optionIndex: number) => {
    setMessages(prev => prev.map((msg, idx) => {
      if (idx !== msgIndex || !msg.items) return msg;
      return {
        ...msg,
        items: msg.items.map((item, gIdx) => {
          if (gIdx !== groupIndex) return item;
          return {
            ...item,
            options: item.options.map((opt, oIdx) => {
              if (oIdx !== optionIndex) return opt;
              return { ...opt, checked: !opt.checked };
            })
          };
        })
      };
    }));
  };

  const formatCopyLine = (text: string, triggerType?: AITriggerType) =>
    triggerType === 'chiefComplaint' || triggerType === 'CurrAsse'
      ? stripListIndexPrefix(text)
      : text;

  const getAllItemsText = (msg: Message) => {
    if (!msg.items) return '';
    return msg.items
      .flatMap((group) => {
        const lines = group.options.map((option) =>
          formatCopyLine(option.text, msg.triggerType)
        );
        if (!group.groupLabel) return lines;
        return [`【${group.groupLabel}】`, ...lines];
      })
      .join('\n\n');
  };

  const getSelectedText = (msg: Message) => {
    if (!msg.items) return msg.text?.trim() ?? '';
    const selected = msg.items
      .flatMap((group) =>
        group.options
          .filter((option) => option.checked)
          .map((option) => formatCopyLine(option.text, msg.triggerType))
      )
      .join('\n\n');
    return selected.trim() ? selected : getAllItemsText(msg);
  };

  const showCopyToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const applySelectedToPastHistory = (msg: Message) => {
    const text = getSelectedText(msg);
    if (!text.trim()) {
      alert('請先勾選要帶入的項目');
      return;
    }
    onApplyPastHistory?.(text);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const copySelected = async (msg: Message) => {
    const textToCopy = getSelectedText(msg).trim();
    if (!textToCopy) {
      alert('沒有可複製的內容');
      return;
    }
    const hasChecked =
      msg.items?.some((g) => g.options.some((o) => o.checked)) ?? false;
    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      showCopyToast(
        hasChecked || !msg.items ? '複製成功' : '已複製全部內容（未勾選任何項目）'
      );
    } else {
      alert('複製失敗，請手動選取文字後以 Ctrl+C 複製');
    }
  };

  const querySelectedIcdCodes = (msg: Message) => {
    if (!msg.items || !onIcdQuery) return;

    const codes = msg.items
      .flatMap((group) =>
        group.options
          .filter((option) => option.checked)
          .map((option) => extractIcdCodeFromText(option.text))
      )
      .filter((code): code is string => Boolean(code));

    if (codes.length === 0) {
      alert("請先勾選要查詢的 ICD 建議項目");
      return;
    }

    onIcdQuery(codes.join(" "));
  };

const downloadAdmissionWord = (msg: Message) => {
  if (!msg.items?.length) {
    alert("無可下載的 AI 回覆內容");
    return;
  }

  // 🔍 關鍵修改：移除 hasChecked 的防呆阻擋，直接交給 downloadAiResponseAsWord 處理
  const ok = downloadAiResponseAsWord(
    msg.items,
    msg.triggerLabel || "轉住院AI生成病歷",
    wordPatientInfo,
    { admission: true, admissionMeta: wordAdmissionMeta }
  );

  if (ok) {
    setToastMessage("Word 檔案下載中");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  }
};

  // icd 觸發
  useEffect(() => {
    if (aiPredictTrigger > 0) handleAIPredict('icd', sourceMode);
  }, [aiPredictTrigger]);

  // 根據輸入類型與資料來源，動態組裝參數並呼叫 AI 進行特定分析
  const handleAIPredict = useCallback((
    type: string, 
    source: DataSource = 'Default', 
  ) => {
    const configs :Record<PromptType, ConfigItem & { triggerType: AITriggerType }> = {
      icd: { 
        prompt: source === 'Local' ? "Local-ICD-mapping" : "ICD-mapping", 
        data: medicalData, 
        label: "ICD-10 診斷建議",
        triggerType: 'icd'
      },
      HistorySP: { 
        prompt: source === 'Local' ? "Local-Admission-Progress summary" : "Admission Note-Progress summary", 
        data: spData, 
        label: "歷程記錄AI摘要",
        triggerType: 'HistorySP'
      },
      CurrAsse: { 
        prompt: source === 'Local' ? "Local-Diagnosis-Past-Chief" : "Diagnosis-PastHistory-Chief", 
        data: medicalData, 
        label: "本次病況AI診斷推論",
        triggerType: 'CurrAsse'
      },
      Admission: { 
        prompt: source === 'Local' ? "Local-Admission Note-Past" : "Admission Note-Past history", 
        data: { ...spData, ...medicalData }, 
        label: "轉住院AI生成病歷",
        triggerType: 'Admission'
      }
    };

    const target = configs[type];
    if (target) sendToAI(target.label, target.prompt, target.data, target.triggerType);
  }, [medicalData, spData, sendToAI]);

  async function handleAction(formData: FormData) {
    formData.set("conversation", selectedRating === "1" ? JSON.stringify(messages) : "");
    formData.set("docid", docid);
    const result = await submitFeedback(formData);
    if (result.success) {
      alert(result.message);
      setShowMessageR(false);
      setSelectedRating("");
      setHoverRating(0);
    } else {
      alert(result.message);
    }
  }
  const [thankForReaction, setThankForReaction] = useState<boolean>(false)
  const handleReaction = async (msgIndex: number, reaction: 'up' | 'down', msg: Message) => {

    setMessageReactions(prev => ({ ...prev, [msgIndex]: reaction }));
    setThankForReaction(true);

    setTimeout(() => {
      setThankForReaction(false);
    }, 3000);

    if (reaction !== 'down') return;

    setDownvotingIndex(msgIndex);
    try {
      const result = await submitAiDownvote({
        docid,
        messageIndex: msgIndex,
        aiMessage: JSON.stringify(msg),
      });
      if (!result.success) {
        alert(result.message);
        setMessageReactions(prev => {
          const next = { ...prev };
          delete next[msgIndex];
          return next;
        });
      }
    } catch {
      alert("回饋儲存失敗，請稍後再試。");
      setMessageReactions(prev => {
        const next = { ...prev };
        delete next[msgIndex];
        return next;
      });
    } finally {
      setDownvotingIndex(null);
    }
  };

  return (
    <div className={`${styles.rightCollapseContent} ${isDarkMode ? styles.dark : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.rightCollapseHeader}>
        <span>AI 智能對話助手</span>
        <div className={styles.rightButton}>
          <div >
            <select value={sourceMode} onChange={(e) => setSourceMode(e.target.value as DataSource)}>
              {/* 其實不管哪個模式都是飛利浦AI 2026/06/29更 */}
              <option value="Default">本地模式</option>
              <option value="Local">標準模式</option>
            </select>
          </div>
          <button onClick={() => setShowMessageR(true)}>意見回饋</button>
        </div>

      </div>
      {showToast && (
        <div className={styles.customToast}>
          <div className={styles.toastContent}>
            {toastMessage}
          </div>
        </div>
      )}

      <div className={styles.reply} ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {messages.map((msg, mIdx) => (
          <div key={mIdx} style={{ marginBottom: '15px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
            <div
              className={`${styles.messageBubble} ${msg.role === 'user' ? styles.userMessageBubble : ''}`}
              style={{
                padding: '8px 12px',
                borderRadius: '12px',
                display: 'inline-block',
                maxWidth: '85%',
                backgroundColor: msg.role === 'user' ? '#96caf5' : isDarkMode ? '#333' : '#eee',
              }}
            >
              {msg.text ? (
                <div className={styles.messageText}>{renderAiBoldText(msg.text)}</div>
              ) : null}
              {msg.items && (
                <div style={{ marginTop: '10px', textAlign: 'left' }}>
                  {msg.items.map((item, groupIdx) => (
                    <div key={item.id} style={{ marginBottom: '10px' }}>
                      {item.groupLabel ? (
                        <div style={{ fontWeight: 'bold', marginBottom: '16px', borderBottom:'1px solid #000', paddingBottom:"10px" }}>{renderAiBoldText(item.groupLabel)}</div>
                        
                      ) : null}
                      {item.options.map((option, optionIdx) => (
                        <label key={option.id} style={{ display: 'flex', marginBottom: '10px', fontSize: '14px' }}>
                          <input
                            type="checkbox"
                            checked={option.checked}
                            onChange={() => handleToggleItem(mIdx, groupIdx, optionIdx)}
                          />
                          <pre className={styles.optionText} style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginLeft: '10px' }}>{renderAiBoldText(option.text)}</pre>
                        </label>
                      ))}
                    </div>
                  ))}
                  <div className={styles.messageActions}>
                    {msg.triggerType === 'HistorySP' && onApplyPastHistory && (
                      <button type="button" onClick={() => applySelectedToPastHistory(msg)}>
                        帶入PAST HISTORY
                      </button>
                    )}
                    <button type="button" onClick={() => copySelected(msg)}>
                      複製內容
                    </button>
                    {msg.triggerType === 'icd' && onIcdQuery && (
                      <button type="button" onClick={() => querySelectedIcdCodes(msg)}>
                        查詢
                      </button>
                    )}
                    {msg.triggerType === 'Admission' && (
                      <button type="button" onClick={() => downloadAdmissionWord(msg)}>
                        儲存 Word
                      </button>
                    )}
                    
                  </div>
                </div>
              )}
            </div>
            {msg.role === 'ai' && !msg.items && msg.text?.trim() && (
              <div className={styles.messageActions}>
                <button type="button" onClick={() => copySelected(msg)}>
                  複製內容
                </button>
              </div>
            )}
            {msg.role === 'ai' && (
              <div className={styles.messageReactions}>
                <button
                  type="button"
                  className={messageReactions[mIdx] === 'up' ? styles.reactionActive : ''}
                  onClick={() => handleReaction(mIdx, 'up', msg)}
                  aria-label="讚"
                >
                  <FaThumbsUp />
                </button>
                <button
                  type="button"
                  className={messageReactions[mIdx] === 'down' ? styles.reactionActive : ''}
                  onClick={() => handleReaction(mIdx, 'down', msg)}
                  disabled={downvotingIndex === mIdx || messageReactions[mIdx] === 'down'}
                  aria-label="倒讚"
                >
                  <FaThumbsDown />
                </button>
                {thankForReaction && mIdx==messages.length-1 && "感謝您提供寶貴的意見"}
              </div>
            )}
          </div>
        ))}
        {loading && <div className={styles.thinking}>AI 正在思考...</div>}
      </div>

      <div className={styles.rightButton}>
        <button onClick={() => handleAIPredict('HistorySP', sourceMode)}>歷程記錄AI摘要</button>
        <button onClick={() => handleAIPredict('CurrAsse', sourceMode)}>本次病況AI診斷推論</button>
        <button onClick={() => handleAIPredict('Admission', sourceMode)}>轉住院AI生成病歷</button>
      </div>

      <div className={styles.searchBar}>
        <input 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="請輸入問題..."
		  className={styles.searchInput}
        />
        <button onClick={handleSendMessage} disabled={loading}><FaPaperPlane /></button>
      </div>
      
      {showMessageR && (
        <div className={`${styles.modalOverlay} ${isDarkMode ? styles.dark : ""}`} onClick={() => setShowMessageR(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            

            <form action={handleAction} className={`${styles.message}`}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h2>您覺得這次的回覆如何?</h2>
              <button className={styles.cencel} type="button" onClick={() => setShowMessageR(false)}>✕</button>
            </div>
            <div className={styles.starRating}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={
                    (hoverRating || Number(selectedRating)) >= star ? styles.filled : ''
                  }
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setSelectedRating(String(star))}
                  aria-label={`${star} 星`}
                >
                  <FaStar style={{fontSize: '37px'}}/>
                </button>
              ))}
            </div>
            <input type="hidden" name="rating" value={selectedRating} required />

              <p>意見回覆{selectedRating && selectedRating !== "1" ? "（必填）" : ""}</p>

              <textarea 
                name="comment" 
                className={styles.textarea} 
                placeholder={selectedRating === "1" ? "請描述問題（選填）..." : "請輸入您的建議..."}
                required={selectedRating !== "" && selectedRating !== "1"}
              ></textarea>

              <button type="submit">送出</button>
            </form>
          </div>
        </div>
      )}
      {showMessage && (
          <Alert
              main={'回覆成功'}
              isConfirm={false}
              onCancel={() => setShowMessage(false)}                />
      )}
    </div>
  );
}