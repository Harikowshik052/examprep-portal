/**
 * generate-manifest.js
 *
 * Recursively scans public/data/ and produces public/data/manifest.json.
 * Run automatically before `npm run dev` and `npm run build` via npm lifecycle hooks.
 *
 * Expected folder structure:
 *   public/data/
 *     <Year>/                       e.g. "II year"
 *       <Semester>/                 e.g. "I Semester"
 *         <Subject>/                e.g. "Database Management System"
 *           <Type folder>/          "Notes" | "Previous Papers" | variants
 *             file.pdf
 *
 * Type folders are normalized to: "notes" or "previous_question_papers"
 * (handles any casing/spelling variation —  "notes", "Notes", "Previous papers",
 *  "Previous Papers", "Previous Ouestion Papers", "previous papers", etc.)
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR   = path.join(__dirname, '../public/data');
const OUTPUT     = path.join(DATA_DIR, 'manifest.json');
const SKIP_NAMES = new Set(['manifest.json', 'README.md', '.gitkeep', '.DS_Store', 'Thumbs.db']);

// ─── helpers ────────────────────────────────────────────────────────────────

/** Convert a leading Roman numeral in a string to an integer for sorting. */
function romanOrder(str) {
  const m = str.match(/^([IVX]+)/i);
  if (!m) return 999;
  const map = { I: 1, V: 5, X: 10 };
  const s = m[1].toUpperCase();
  let v = 0;
  for (let i = 0; i < s.length; i++) {
    const cur  = map[s[i]]     || 0;
    const next = map[s[i + 1]] || 0;
    v += cur < next ? -cur : cur;
  }
  return v;
}

/**
 * Normalise the type-folder name to one of two canonical values.
 * Returns null for anything that doesn't look like notes or papers (skip it).
 */
function normalizeType(folderName) {
  const lower = folderName.toLowerCase();
  if (lower.startsWith('note')) return 'notes';
  // covers "previous papers", "previous question papers", "previous ouestion papers", etc.
  if (lower.startsWith('prev') || lower.includes('question') || lower.includes('paper')) {
    return 'previous_question_papers';
  }
  return null;
}

/** Read only subdirectories from a path. */
function subdirs(dir) {
  return fs.readdirSync(dir).filter(name => {
    if (SKIP_NAMES.has(name) || name.startsWith('.')) return false;
    return fs.statSync(path.join(dir, name)).isDirectory();
  });
}

/** Read only files from a path. */
function subfiles(dir) {
  return fs.readdirSync(dir).filter(name => {
    if (SKIP_NAMES.has(name) || name.startsWith('.')) return false;
    return fs.statSync(path.join(dir, name)).isFile();
  });
}

// ─── main scan ──────────────────────────────────────────────────────────────

if (!fs.existsSync(DATA_DIR)) {
  console.log('[manifest] public/data not found – skipping.');
  process.exit(0);
}

const entries = [];

const years = subdirs(DATA_DIR).sort((a, b) => romanOrder(a) - romanOrder(b));

for (const year of years) {
  const yearPath = path.join(DATA_DIR, year);
  const semesters = subdirs(yearPath).sort((a, b) => romanOrder(a) - romanOrder(b));

  for (const semester of semesters) {
    const semPath  = path.join(yearPath, semester);
    const subjects = subdirs(semPath).sort((a, b) => a.localeCompare(b));

    for (const subject of subjects) {
      const subPath     = path.join(semPath, subject);
      const typeFolders = subdirs(subPath);

      for (const typeFolder of typeFolders) {
        const type = normalizeType(typeFolder);
        if (!type) continue;                         // skip unknown folders

        const typePath = path.join(subPath, typeFolder);
        const files    = subfiles(typePath);

        for (const filename of files) {
          // Build a URL-safe path relative to /  (public/ is the root)
          const urlPath = ['data', year, semester, subject, typeFolder, filename]
            .map(seg => encodeURIComponent(seg).replace(/%20/g, '%20')) // keep spaces encoded
            .join('/');

          entries.push({
            year,
            semester,
            subject,
            type,                                    // "notes" | "previous_question_papers"
            filename,
            label: filename.replace(/\.pdf$/i, ''),
            path: '/' + urlPath,
          });
        }
      }
    }
  }
}

fs.writeFileSync(OUTPUT, JSON.stringify(entries, null, 2));
console.log(`[manifest] Generated ${entries.length} entries → public/data/manifest.json`);
