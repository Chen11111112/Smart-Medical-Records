import styles from '@/styles/components/Layout/Alert.module.scss';
import { MouseEvent } from "react";
import { useTheme } from "@/context/ThemeContext";

interface Props {
    main: string;            
    onConfirm?: () => void;  
    onCancel?: () => void;  
    isConfirm?: boolean;
}

export default function Alert({ main, onConfirm, onCancel, isConfirm = false }: Props) {
    const { isDarkMode } = useTheme();
    const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && onCancel) {
            onCancel();
        }
    };

    return (
          <div className={`${styles.modalOverlay} ${isDarkMode ? styles.dark : ''}`} onClick={handleBackdropClick}>
            <div className={styles.message} onClick={(e) => e.stopPropagation()}>
                <p>{main}</p>

                {isConfirm ? (
                    <div>
                        <button onClick={onConfirm}>確定</button>
                        <button onClick={onCancel}>取消</button>
                    </div>
                ): <button onClick={onCancel}>✕</button>}
                
            </div>
        </div>
    );
}
