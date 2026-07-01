import type { ChangeEvent } from 'react';
import styles from '@/styles/components/MedicalForm.module.scss';

export interface VitalData {
  bp_s: string;
  bp_d: string;
  pr: string;
  rr: string;
  bt: string;
  bw: string;
  疼痛評估: string;
}

type VitalField = keyof Omit<VitalData, '疼痛評估'>;

interface Props {
  vitals: VitalData;
  vitalsLoaded: boolean;
  onVitalsChange: (field: VitalField, value: string) => void;
}

export default function VitalSignsSection({
  vitals,
  vitalsLoaded,
  onVitalsChange,
}: Props) {
  const isEditable = () => vitalsLoaded;

  const inputProps = (field: VitalField) => ({
    type: 'text' as const,
    className: styles.vitalInput,
    value: vitals?.[field] ?? '',
    readOnly: !isEditable(),
    onChange: (e: ChangeEvent<HTMLInputElement>) =>
      onVitalsChange(field, e.target.value),
  });

  return (
    <div className={styles.formSection}>
      <div className={styles.sectionHeader}>VITAL SIGNS</div>
      <div className={styles.sectionContent}>
        <div className={styles.vitalSignsGrid}>
          
          {/* BP 與 PR */}
          <div className={styles.vitalItem}>
            <label>BP :</label>
            <div className={styles.bpInputGroup}>
              <span>(</span>
              <input {...inputProps('bp_s')} />
              <span>/</span>
              <input {...inputProps('bp_d')} />
              <span>)</span>
            </div>
            <span className={styles.unit}>mmHg</span>
          </div>

          <div className={styles.vitalItem}>
            <label>PR :</label>
            <input {...inputProps('pr')} />
            <span className={styles.unit}>/min</span>
          </div>

          {/* RR, BT, BW */}
          <div className={styles.vitalItem}>
            <label>RR :</label>
            <input {...inputProps('rr')} />
            <span className={styles.unit}>/min</span>
          </div>

          <div className={styles.vitalItem}>
            <label>BT :</label>
            <input {...inputProps('bt')} />
            <span className={styles.unit}>°C</span>
          </div>

          <div className={styles.vitalItem}>
            <label>BW :</label>
            <input {...inputProps('bw')} />
            <span className={styles.unit}>Kg</span>
          </div>

        </div>
      </div>
    </div>
  );
}