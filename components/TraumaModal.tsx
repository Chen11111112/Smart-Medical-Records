{/* 選擇模板並顯示*/}
import { MouseEvent } from 'react';
import styles from '@/styles/components/TraumaModel.module.scss';
import {ModelItem} from "@/lib/data/modelData";
import { useTheme } from "@/context/ThemeContext";

import { FaUserDoctor } from "react-icons/fa6";

type Props = {
  closeModal: () => void;
  tab: string;
  onSelect: (item:ModelItem ) => void;
  data:ModelItem[];
};

export default function TraumaModal({ closeModal, tab, onSelect, data}: Props) {
  const { isDarkMode } = useTheme();


  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const handleClickItem = (item: ModelItem) => {
    onSelect({
      ...item,
      department:  item['department'] || tab,
    });
    closeModal();
  };


 return (
  <div className={`${styles.modalOverlay} ${isDarkMode ? styles.dark : ''}`} onClick={handleBackdropClick}>
    <div className={styles.modalContainer}>


      <div className={styles.modalHeader}>
           <div className={styles.modalTitle}>{tab}科 模組</div>
           <button className={styles.closeBtn} onClick={closeModal}>✕</button>

          </div>

          {tab === '新增' ? '': <hr/>}
          <div className={styles.selectionGrid}>
            {data.map((item, idx) => (
              <div
                key={idx}
                className={styles.selectionItem}
                onClick={() => handleClickItem(item)}
              >
                {item['name']}
              </div>
           ))}
          </div>
    </div>
  </div>

  );
}