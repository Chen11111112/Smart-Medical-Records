import React, { useEffect, useState } from 'react';
import styles from '@/styles/components/History.module.scss';
import { SpTable } from '@/components/MedicalRow'
import {SpPayload} from '@/lib/data/spData'
import { fetchErsReport } from '@/app/actions/resghtmrActions';
import {
  buildErsReportTitle,
  parseErsReportHtml,
} from '@/lib/utils/parseErsReportHtml';
import { useTheme } from '@/context/ThemeContext';
import { DEMO_HOSPITAL_INTEGRATION_DISABLED } from '@/lib/constants/demoIntegration';


interface Props{
    spData:SpPayload | null,
    loading?: boolean;
    hideTitle?: boolean;
    onCloseAllReady?: (closeAll: () => void) => void;
}


export default function HistoryItems({
    spData,
    loading = false,
    hideTitle = false,
    onCloseAllReady,
}:Props) {

  const { isDarkMode } = useTheme();


  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  const closeAll = () => {
    setExpandedItems(prev => {
      const resetState = Object.keys(prev).reduce((acc, id) => {
        acc[id] = false;
        return acc;
      }, {} as Record<string, boolean>);
      
      return resetState;
    });
  };

  useEffect(() => {
    onCloseAllReady?.(closeAll);
  }, [onCloseAllReady]);

  const [reportHtml, setReportHtml] = useState<string>("");
  const [ersReportRows, setErsReportRows] = useState<any[]>([]);
  const [ersLoading, setErsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (DEMO_HOSPITAL_INTEGRATION_DISABLED) {
      setErsReportRows([]);
      return;
    }

    if (!expandedItems["檢查驗報告內容"]) return;

    const list = spData?.ers_list;
    if (!list?.length) {
      setErsReportRows([]);
      return;
    }

    let cancelled = false;

    const loadErsReports = async () => {
      setErsLoading(true);
      try {
        const rows = await Promise.all(
          list.map(async (record: any) => {
            if (!record?.申請單號) return null;

            try {
              const html = await fetchErsReport({
                partno: record.月份,
                histno: record.histno,
                seqcn: record.seqcn,
                seqno: record.醫囑序號,
                reqno: record.申請單號,
                signid: "ISC9077",
              });

              const meta = parseErsReportHtml(html);
              if (!meta) return null;

              return {
                ...record,
                _title: buildErsReportTitle(meta),
                _titleHead: meta.medicalOrder,
                _titleDate: meta.date,
                _reportHtml: html,
                _titleOnly: true,
              };
            } catch {
              return null;
            }
          })
        );

        if (!cancelled) {
          setErsReportRows(rows.filter(Boolean));
        }
      } finally {
        if (!cancelled) setErsLoading(false);
      }
    };

    loadErsReports();
    return () => {
      cancelled = true;
    };
  }, [expandedItems["檢查驗報告內容"], spData?.ers_list]);

  const handleOpenResghtmr = (record: any) => {
    setIsModalOpen(true);
    setReportHtml(record?._reportHtml || "查無報告內容");
  };

  return (
    <div className={`${styles.leftTop} ${isDarkMode ? styles.dark : ''}`}>
      
      
      {!hideTitle && (
        <div className={styles.historyTitle}>
          {loading ? (
            <p>過去病歷 / 過敏資訊 - 載入中...</p>
          ) : (
            <p>過去病歷 / 過敏資訊</p>
          )}
          <button type="button" onClick={closeAll}>全部收起</button>
        </div>
      )}
      
      <div className={styles.historyItems}>
        
        {error && <p className={styles.errorText}>{error}</p>}

        <div className={styles.theme}>
          <div className={styles.historyItem} onClick={() => toggleExpand("藥品過敏或不良反應")}>
            <h2>藥品過敏或不良反應</h2>
            <div className={styles.expandIcon}>
              ▼
            </div>
          </div>
          {expandedItems["藥品過敏或不良反應"] && (
            <div className={styles.expandedPanel}>
            <div className={styles.historyList}>
              {(spData?.pbabstrc || []).length > 0 ? (
              spData?.pbabstrc.map((item, idx) => (
                <div key={idx} className={styles.historyRow}>
                  <span className={styles.date}>{item.日期}</span>
                  <span className={styles.subject}>{item.主題}</span>
                  <span className={styles.desc}>{item.描述}</span>
                </div>
              ))
            ) : (
              <div className={styles.noData}>無相關紀錄</div>
            )}
            </div>
            
          </div>)}
          


          <div className={styles.historyItem} onClick={() => toggleExpand("手術紀錄")}>
            <h2>手術紀錄</h2>
            <div className={styles.expandIcon}>
              {expandedItems["手術紀錄"] ? '▼' : '▶'}
            </div>
          </div>
          {expandedItems["手術紀錄"] && SpTable(spData?.opsoraq1 || [])}


          <div className={styles.historyItem} onClick={() => toggleExpand("門診紀錄")}>
            <h2>門診紀錄</h2>
            <div className={styles.expandIcon}>
              {expandedItems["門診紀錄"] ? '▼' : '▶'}
            </div>
          </div>
          {expandedItems["門診紀錄"] && SpTable(spData?.dtarotq4 || [])}

          <div className={styles.historyItem} onClick={() => toggleExpand("歷次報告SMAC")}>
            <h2>歷次報告 SMAC</h2>
            <div className={styles.expandIcon}>
              {expandedItems["歷次報告SMAC"] ? '▼' : '▶'}
            </div>
          </div>
          {expandedItems["歷次報告SMAC"] && SpTable(spData?.reslab01 || [])}

          <div className={styles.historyItem} onClick={() => toggleExpand("歷次報告CBC")}>
            <h2>歷次報告 CBC</h2>
            <div className={styles.expandIcon}>
              {expandedItems["歷次報告CBC"] ? '▼' : '▶'}
            </div>
          </div>
          {expandedItems["歷次報告CBC"] && SpTable(spData?.reslab02 || [])}

          <div className={styles.historyItem} onClick={() => toggleExpand("出入院日期科別")}>
            <h2>出入院日期科別</h2>
            <div className={styles.expandIcon}>
              {expandedItems["出入院日期科別"] ? '▼' : '▶'}
            </div>
          </div>
          {expandedItems["出入院日期科別"] && SpTable(spData?.dislist || [])}

          {/* <div className={styles.historyItem} onClick={() => toggleExpand("出入院日期科別內容")}>
            <h2>出入院日期科別內容</h2>
            <div className={styles.expandIcon}>
              {expandedItems["出入院日期科別內容"] ? '▼' : '▶'}
            </div>
          </div>
          {expandedItems["出入院日期科別內容"] && SpTable(spData?.disdisp || [])} */}

          <div className={styles.historyItem} onClick={() => toggleExpand("檢查驗報告內容")}>
            <h2>檢查驗報告內容</h2>
            <div className={styles.expandIcon}>
              {expandedItems["檢查驗報告內容"] ? '▼' : '▶'}
            </div>  
          </div>
          {expandedItems["檢查驗報告內容"] && (
            <div className={styles.container}>
              {ersLoading && <div className={styles.noData}>報告載入中...</div>}
              {!ersLoading && ersReportRows.length === 0 && (
                <div className={styles.noData}>無可顯示的檢查驗報告</div>
              )}
              {!ersLoading && ersReportRows.length > 0 && SpTable(ersReportRows, handleOpenResghtmr)}
            </div>
          )}


          {isModalOpen && (
            <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                
                <div className={styles.header}>
                  <h3 style={{ color: isDarkMode ?  "#fff" : ""}}>檢驗報告明細</h3>
                  <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                    &times;
                  </button>
                </div>

                <div className={styles.body}>
                  {reportHtml ? (
                    <div 
                      className={`report-container${isDarkMode ? ' report-dark' : ''}`}
                      dangerouslySetInnerHTML={{ __html: reportHtml }} 
                    />
                  ) : (
                    <div className={styles.emptyHint}>讀取中或查無報告內容...</div>
                  )}
                </div>



              </div>
            </div>
          )}


    </div>
      </div>
    </div>
  );
}

