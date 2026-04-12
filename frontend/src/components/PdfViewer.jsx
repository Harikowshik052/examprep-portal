import { useState } from 'react';
import styles from './PdfViewer.module.css';

export default function PdfViewer({ entry }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!entry) {
    return (
      <div className={styles.placeholder}>
        <span className={styles.placeholderIcon}>📂</span>
        <p>Select a file from the filters above to view it here.</p>
      </div>
    );
  }

  const pdfUrl = entry.path;

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar}>
        <div className={styles.fileInfo}>
          <span className={styles.fileIcon}>📄</span>
          <div>
            <div className={styles.fileName}>{entry.label}</div>
            <div className={styles.fileMeta}>
              {entry.year} · {entry.semester} · {entry.subject}
            </div>
          </div>
        </div>
        <a
          href={pdfUrl}
          download={entry.filename}
          className={styles.downloadBtn}
          title="Download PDF"
        >
          ⬇ Download
        </a>
      </div>

      {error ? (
        <div className={styles.errorState}>
          <p>Could not load PDF. The file may not exist yet.</p>
          <a href={pdfUrl} download className={styles.downloadLink}>
            Try downloading instead
          </a>
        </div>
      ) : (
        <div className={styles.iframeWrapper}>
          {loading && (
            <div className={styles.loadingOverlay}>
              <span className={styles.spinnerDark} />
              <span>Loading PDF…</span>
            </div>
          )}
          <iframe
            key={pdfUrl}
            src={pdfUrl}
            title={entry.label}
            className={styles.iframe}
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
          />
        </div>
      )}
    </div>
  );
}
