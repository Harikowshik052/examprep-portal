# Data Folder

Place your PDF files here following the structure:

```
data/
  <year>/
    <semester>/
      <subject>/
        notes/
          your_file.pdf
        previous_question_papers/
          your_file.pdf
```

After adding files, update `src/data/dataIndex.js` with the corresponding entries.

**Naming conventions used:**
- Year: `I_year`, `II_year`, `III_year`, `IV_year`
- Semester: `I_semester`, `II_semester`
- Subject: lowercase with underscores (e.g., `data_structures`, `java`, `dbms`)
