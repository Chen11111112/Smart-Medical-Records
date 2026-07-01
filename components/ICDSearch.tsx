import React, { useEffect, useState } from "react";
import styles from '@/styles/components/ICD.module.scss';
import { ICDItem } from '@/lib/data/icdData';
import { searchIcdAction } from "@/app/actions/icdActions";
import { useTheme } from "@/context/ThemeContext";
// import { copyToClipboard } from '@/lib/utils/copyToClipboard';

const MAX_SELECTIONS = 5;

interface ResultCardProps {
  item: ICDItem;
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
}

interface Props {
  handleICDSelect: (data: ICDItem[]) => void;
  initialSelected?: ICDItem[];
  externalSearchKeyword?: string | null;
  onExternalSearchConsumed?: () => void;
}

const ICDSearch = ({
  handleICDSelect,
  initialSelected = [],
  externalSearchKeyword,
  onExternalSearchConsumed,
}: Props) => {
  const { isDarkMode } = useTheme();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [data, setData] = useState<ICDItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<ICDItem[]>([]);

  const syncSelection = (items: ICDItem[]) => {
    setSelectedItems(items);
    handleICDSelect(items);
  };

  const handleSearch = async (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;

    try {
      setLoading(true);
      setError("");
      const results = await searchIcdAction(trimmed);
      setData(results);
      setShowModal(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const initialSelectedKey = initialSelected.map((i) => i.id).join("|");

  useEffect(() => {
    setSelectedItems(initialSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedKey]);

  useEffect(() => {
    if (!externalSearchKeyword?.trim()) return;
    setInput(externalSearchKeyword.trim());
    handleSearch(externalSearchKeyword.trim());
    onExternalSearchConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSearchKeyword]);

  const isSelected = (item: ICDItem) =>
    selectedItems.some((s) => s.id === item.id);

  const toggleSelect = (item: ICDItem) => {
    if (isSelected(item)) {
      syncSelection(selectedItems.filter((s) => s.id !== item.id));
      return;
    }
    if (selectedItems.length >= MAX_SELECTIONS) {
      alert(`最多只能選取 ${MAX_SELECTIONS} 筆 ICD 代碼`);
      return;
    }
    syncSelection([...selectedItems, item]);
  };

  const removeSelected = (item: ICDItem) => {
    syncSelection(selectedItems.filter((s) => s.id !== item.id));
  };

  // const handleCopyCode = async (
  //   text: string,
  //   setCopied: React.Dispatch<React.SetStateAction<boolean>>
  // ) => {
  //   const ok = await copyToClipboard(text);
  //   if (ok) {
  //     setCopied(true);
  //     setTimeout(() => setCopied(false), 1000);
  //   } else {
  //     alert('複製失敗，請手動選取代碼後以 Ctrl+C 複製');
  //   }
  // };

  const ResultCard = ({
    item,
    selected = false,
    onSelect,
    onRemove,
    showRemove = false,
  }: ResultCardProps) => {
    // const [copied, setCopied] = useState(false);

    return (
      <div
        className={`${styles.card} ${isDarkMode ? styles.dark : ""} ${selected ? styles.cardSelected : ""}`}
        style={{ cursor: onSelect ? "pointer" : "default" }}
        onClick={onSelect}
      >
        {selected && <div className={styles.selectedBadge}>已選取</div>}
        <div className={styles.code}>
          {/* style={{ cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            handleCopyCode(item.id, setCopied);
          }} */}
          {`代碼: ${item.id}`}
          {/* {copied ? "已複製！" : `代碼: ${item.id}`} */}
        </div>
        <div className={styles.zhName}>{item.zhName}</div>
        <div className={styles.enName}>{item.enName}</div>
        {showRemove && onRemove && (
          <button
            type="button"
            className={styles.removeBtn}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            移除
          </button>
        )}
      </div>
    );
  };

  const handleKeyPress = (e: { key: string }) => {
    if (e.key === "Enter") handleSearch(input);
  };

  const delFin = () => {
    syncSelection([]);
    setData([]);
    setInput("");
    setShowModal(false);
  };

  return (
    <div className={`${styles.container} ${isDarkMode ? styles.dark : ""}`}>
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="右側 異物 胸腔"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          value={input}
        />
        <button type="button" onClick={() => handleSearch(input)}>
          查詢
        </button>
      </div>

      <div className={styles.bodyScroll}>
        {selectedItems.length > 0 && (
          <p className={styles.selectionHint}>
            已選取 {selectedItems.length}/{MAX_SELECTIONS} 筆
          </p>
        )}

        {error && <p className={styles.error}>{error}</p>}
        {loading && <div className={styles.loader}>載入中...</div>}

        {selectedItems.length > 0 && (
          <div className={styles.selectedList}>
            {selectedItems.map((item) => (
              <ResultCard
                key={item.id}
                item={item}
                selected
                showRemove
                onRemove={() => removeSelected(item)}
              />
            ))}
          </div>
        )}

        {data.length > 0 && (
          <div className={styles.reopenButtonContainer}>
            <button type="button" onClick={() => setShowModal(true)}>
              顯示原搜尋結果
            </button>
            <button type="button" onClick={delFin}>
              清除搜尋結果
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div
            className={`${styles.modal} ${isDarkMode ? styles.dark : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <span>搜尋結果（點選加入，最多 {MAX_SELECTIONS} 筆）</span>
              <button
                type="button"
                className={styles.modalCloseBtn}
                aria-label="關閉"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalContent}>
                {data && data.length > 0 ? (
                  data.map((item) => (
                    <div className={styles.column} key={item.id}>
                      <ResultCard
                        item={item}
                        selected={isSelected(item)}
                        onSelect={() => toggleSelect(item)}
                      />
                    </div>
                  ))
                ) : (
                  "與院內申報資料庫比對，查無符合項目"
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" onClick={() => setShowModal(false)}>
                完成
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ICDSearch;
