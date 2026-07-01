/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import styles from '@/styles/components/History.module.scss';

interface Props{
  record: any;
  isOdd: boolean;
  onClick: () => void;
  titleOnly?: boolean;
}

export const MedicalRow = ({ record, isOdd, onClick, titleOnly = false }: Props) => {
  const blackList = ["就診號", "病患ID", "histno", "_title"];

  const [isExpanded, setIsExpanded] = useState(false);

  const displayTitle = record._title ? String(record._title) : "";
  const entries = Object.entries(record).filter(([key]) => key !== "_title");
  const visibleEntries = entries.filter(([key]) => !blackList.includes(key));

  const details = displayTitle
    ? visibleEntries.filter(([key]) => key !== "日期")
    : visibleEntries.slice(1);

  const [titleKey, titleValue] = displayTitle
    ? ["", displayTitle]
    : (visibleEntries[0] ?? ["", ""]);

  const isTitleOnly = titleOnly || Boolean(record._titleOnly);

  const titleHead = record._titleHead != null ? String(record._titleHead) : "";
  const titleDate = record._titleDate != null ? String(record._titleDate) : "";
  const showSplitTitle = Boolean(titleHead || titleDate);

  if (isTitleOnly) {
    return (
      <table
        className={styles.table}
        style={{ marginBottom: "8px", cursor: "pointer" }}
        onClick={onClick}
      >
        <tbody>
          <tr className={`${styles.headerRow} ${isOdd ? styles.odd : ""}`}>
            <td colSpan={2}>
              {showSplitTitle ? (
                <>
                  <strong>{titleDate || String(titleValue || displayTitle)}</strong>
                  {titleHead ? `\u3000\u3000${titleHead}` : null}
                </>
              ) : (
                <strong>{String(titleValue || displayTitle)}</strong>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className={styles.table} style={{ marginBottom: '8px' }} onClick={onClick}>
      <thead>
        <tr
          className={`${styles.headerRow} ${isOdd ? styles.odd : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          <td colSpan={2} className={styles.keyCell}>
            <span className={styles.icon}>{isExpanded ? '▼' : '▶'}</span>
            <strong>{String(titleValue)}</strong>
          </td>
        </tr>
      </thead>

      <tbody>
        {isExpanded && details.map(([key, value], index) => (
          <tr key={key} className={`${styles.item} ${index % 2 === 1 ? styles.odd : ""}`}>
            <td style={{ paddingLeft: '32px', fontSize: '0.9em' }}>
              {key}
            </td>
            <td className={styles.valueCell}>
              {value === null || value === undefined ? "—" : String(value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const SpTable = (
  data: any[],
  onRowClick?: (record: any) => void
) => {
  if (!data || data.length === 0) return <div>暫無資料</div>;

  return (
    <div className={styles.container}>
      {data.map((record, index) => (
        <MedicalRow
          onClick={() => onRowClick?.(record)}
          key={index}
          record={record}
          isOdd={index % 2 === 1}
          titleOnly={record._titleOnly}
        />
      ))}
    </div>
  );
};
