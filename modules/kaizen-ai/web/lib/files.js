// Student file library. Text-like files get their content extracted so the
// tutor can actually read them; binaries keep metadata only (parsed server-side
// in the full backend). localStorage for now — same interface when it moves
// to Supabase storage.

const KEY = 'kaizen.files.v1';
const MAX_TEXT = 15000; // chars kept per file
const TEXTY = /\.(txt|md|markdown|csv|json|tex|py|js|html?)$/i;

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
}

export function loadFiles() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFiles(files) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(files));
  } catch {
    // storage full — drop oldest text payloads and retry once
    try {
      const slim = files.map((f, i) =>
        i < files.length - 10 ? { ...f, text: null } : f
      );
      window.localStorage.setItem(KEY, JSON.stringify(slim));
    } catch { /* give up quietly */ }
  }
}

export function isTextFile(file) {
  return TEXTY.test(file.name) || (file.type || '').startsWith('text/');
}

// Read a browser File → library record (extracts text when possible).
export function ingestFile(file, { courseId = null, concept = null } = {}) {
  return new Promise((resolve) => {
    const base = {
      id: uid(),
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      courseId,
      concept,
      text: null,
      addedAt: new Date().toISOString(),
    };
    if (!isTextFile(file) || file.size > 2 * 1024 * 1024) {
      resolve(base);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ ...base, text: String(reader.result || '').slice(0, MAX_TEXT) });
    reader.onerror = () => resolve(base);
    reader.readAsText(file);
  });
}

// Files relevant to a tutoring session: exact concept tag first,
// then anything tagged to the same course.
export function relevantFiles(files, { concept, courseId }) {
  const byConcept = files.filter((f) => f.concept && concept && f.concept === concept);
  const byCourse = files.filter(
    (f) => f.courseId && courseId && f.courseId === courseId && !byConcept.includes(f)
  );
  return [...byConcept, ...byCourse].slice(0, 3);
}

export function prettySize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
