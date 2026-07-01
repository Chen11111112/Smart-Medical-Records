import type { ChangeEvent, CSSProperties, Ref } from 'react';
import styles from '@/styles/components/MedicalForm.module.scss';
import {
  getFieldCharLimit,
  isFieldOverLimit,
  type MedicalTextFieldKey,
} from '@/lib/constants/fieldLimits';

interface Props {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  fieldKey: MedicalTextFieldKey;
  rows?: number;
  readOnly?: boolean;
  placeholder?: string;
  style?: CSSProperties;
  sectionRef?: Ref<HTMLDivElement>;
}

export default function CharCountTextarea({
  value,
  onChange,
  fieldKey,
  rows = 3,
  readOnly = false,
  placeholder,
  style,
  sectionRef,
}: Props) {
  const limit = getFieldCharLimit(fieldKey);
  const length = (value ?? '').length;
  const isOver = isFieldOverLimit(value, fieldKey);

  return (
    <div ref={sectionRef}>
      <textarea
        className={`${styles.inputField} ${isOver ? styles.inputFieldOverLimit : ''}`}
        rows={rows}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        style={style}
        maxLength={limit}
      />
      <div className={`${styles.charCount} ${isOver ? styles.charCountOver : ''}`}>
        {length}/{limit}
      </div>
    </div>
  );
}
