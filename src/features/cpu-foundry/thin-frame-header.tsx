import styles from './cpu-foundry-sim.module.css';

type ThinFrameHeaderProps = {
  frameName: string;
  subtitle: string;
  onBack: () => void;
  backLabel: string;
};

export function ThinFrameHeader({ frameName, subtitle, onBack, backLabel }: ThinFrameHeaderProps) {
  return (
    <div className={styles.screenFrameHeader}>
      <div className={styles.frameHeading}>
        <strong className={styles.frameName}>{frameName}</strong>
        <p className={styles.frameSubName}>{subtitle}</p>
      </div>
      <button type="button" className={styles.closeButton} onClick={onBack} aria-label={backLabel}>
        ←
      </button>
    </div>
  );
}
