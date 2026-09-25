import type { FileEmbedResponse, RawFileItem, RawQuizManifestEntry } from "../types";

const FILE_PROXY_BASE = "https://icse-file-proxy1.bybro.workers.dev";
const QUIZ_PROXY_BASE = "https://icse-file-proxy2.bybro.workers.dev";

/** Fetches the whole files.json tree (contents of icse-resources-files). */
export async function fetchFilesJson(): Promise<RawFileItem[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}files.json`);
  if (!res.ok) throw new Error(`Failed to load files.json (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Fetches the flat quiz manifest (contents of the separate quizzes/ folder). */
export async function fetchQuizManifest(): Promise<RawQuizManifestEntry[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}quizzes.json`);
  if (!res.ok) throw new Error(`Failed to load quizzes.json (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** GET {proxy1}/file?id=<fileId> — used as the <img> src for images; other file types are
 *  embedded straight from Drive's own preview URL, this call just confirms the file is reachable. */
export async function fetchFileEmbed(fileId: string): Promise<FileEmbedResponse> {
  const res = await fetch(`${FILE_PROXY_BASE}/file?id=${fileId}`);
  if (!res.ok) throw new Error(`File proxy responded with ${res.status}`);
  return res.json();
}

/** GET {proxy2}/file?id=<fileId> — returns the raw .txt quiz content, parsed client-side via quizParser. */
export async function fetchQuizText(fileId: string): Promise<string> {
  const res = await fetch(`${QUIZ_PROXY_BASE}/file?id=${fileId}`);
  if (!res.ok) throw new Error(`Quiz proxy responded with ${res.status}`);
  const text = await res.text();
  if (text.trim().startsWith("<!DOCTYPE html>") || text.trim().startsWith("<html")) {
    throw new Error("Worker returned an HTML page instead of raw text.");
  }
  return text;
}

/**
 * Parses public/synonyms.txt — one entry per line, `key = phrase, phrase, …`.
 * Blank lines and lines starting with `#` are ignored. Returns {} (search
 * still works with literal term matching) if the file can't be loaded.
 */
export async function fetchSynonyms(): Promise<Record<string, string[]>> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}synonyms.txt`);
    if (!res.ok) return {};
    const text = await res.text();
    const map: Record<string, string[]> = {};
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) continue;
      const key = line.slice(0, separatorIndex).trim().toLowerCase();
      const values = line
        .slice(separatorIndex + 1)
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);
      if (key && values.length > 0) map[key] = values;
    }
    return map;
  } catch {
    return {};
  }
}
