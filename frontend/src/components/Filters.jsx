import { useState, useEffect } from 'react';
import { useManifest } from '../hooks/useManifest';
import { getYears, getSemesters, getSubjects, getTypes, getFiles } from '../utils/dataUtils';
import styles from './Filters.module.css';

const TYPE_LABELS = {
  notes: 'Notes',
  previous_question_papers: 'Previous Question Papers',
};

export default function Filters({ onFileSelect }) {
  const { data, loading, error } = useManifest();

  const [year, setYear]               = useState('');
  const [semester, setSemester]       = useState('');
  const [subject, setSubject]         = useState('');
  const [type, setType]               = useState('');
  const [selectedFile, setSelectedFile] = useState('');

  // Derived lists — driven purely from manifest
  const years     = getYears(data);
  const semesters = year     ? getSemesters(data, year)                : [];
  const subjects  = semester ? getSubjects(data, year, semester)       : [];
  const types     = subject  ? getTypes(data, year, semester, subject) : [];
  const files     = type     ? getFiles(data, year, semester, subject, type) : [];

  // Reset downstream when upstream changes
  useEffect(() => { setSemester(''); setSubject(''); setType(''); setSelectedFile(''); }, [year]);
  useEffect(() => { setSubject(''); setType(''); setSelectedFile(''); }, [semester]);
  useEffect(() => { setType(''); setSelectedFile(''); }, [subject]);
  useEffect(() => { setSelectedFile(''); }, [type]);

  useEffect(() => {
    if (selectedFile) {
      onFileSelect(files.find((f) => f.filename === selectedFile) || null);
    } else {
      onFileSelect(null);
    }
  }, [selectedFile]);

  if (loading) {
    return (
      <div className={styles.filters}>
        <p className={styles.statusMsg}>Loading materials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.filters}>
        <p className={styles.statusMsg} style={{ color: 'var(--danger, #dc2626)' }}>
          Could not load data: {error}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.filters}>
      <h2 className={styles.heading}>Filter Study Materials</h2>
      <div className={styles.grid}>

        <div className={styles.field}>
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">-- Select Year --</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <label>Semester</label>
          <select value={semester} onChange={(e) => setSemester(e.target.value)} disabled={!year}>
            <option value="">-- Select Semester --</option>
            {semesters.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <label>Subject</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!semester}>
            <option value="">-- Select Subject --</option>
            {subjects.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} disabled={!subject}>
            <option value="">-- Select Type --</option>
            {types.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
            ))}
          </select>
        </div>

      </div>

      {files.length > 0 && (
        <div className={styles.fileList}>
          <label className={styles.fileLabel}>Select File</label>
          <div className={styles.fileOptions}>
            {files.map((f) => (
              <button
                key={f.filename}
                className={`${styles.fileBtn} ${selectedFile === f.filename ? styles.active : ''}`}
                onClick={() => setSelectedFile(f.filename)}
              >
                {'\u{1F4C4}'} {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {year && semester && subject && type && files.length === 0 && (
        <p className={styles.noFiles}>No files available for this selection.</p>
      )}
    </div>
  );
}
