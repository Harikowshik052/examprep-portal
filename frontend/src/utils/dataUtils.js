/**
 * All helpers operate on the manifest array fetched from /data/manifest.json.
 * Each entry shape: { year, semester, subject, type, filename, label, path }
 */

export function getPdfUrl(entry) {
  return entry.path; // already URL-encoded by the manifest generator
}

export function getYears(index) {
  return [...new Set(index.map((e) => e.year))];
  // order is preserved from the manifest (which is sorted by Roman numeral)
}

export function getSemesters(index, year) {
  return [...new Set(index.filter((e) => e.year === year).map((e) => e.semester))];
}

export function getSubjects(index, year, semester) {
  return [...new Set(
    index.filter((e) => e.year === year && e.semester === semester).map((e) => e.subject)
  )];
}

export function getTypes(index, year, semester, subject) {
  return [...new Set(
    index
      .filter((e) => e.year === year && e.semester === semester && e.subject === subject)
      .map((e) => e.type)
  )];
}

export function getFiles(index, year, semester, subject, type) {
  return index.filter(
    (e) => e.year === year && e.semester === semester && e.subject === subject && e.type === type
  );
}
