import type { Question } from "../types";

/**
 * Pulls the file id out of any Drive share/open/uc link
 * (…/file/d/<id>/view, …/open?id=<id>, …/uc?id=<id>). Returns null for
 * non-Drive URLs so they can be used directly as an image src.
 */
function extractDriveFileId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)(drive|docs)\.google\.com$/.test(parsed.hostname)) return null;
    const pathMatch = parsed.pathname.match(/\/d\/([^/]+)/);
    return pathMatch ? pathMatch[1] : parsed.searchParams.get("id");
  } catch {
    return null;
  }
}

export function parseQuizTxt(text: string): Question[] {
  const questions: Question[] = [];

  // Remove BOM and normalize line endings
  const cleanText = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const blocks = cleanText.split(/\n\s*\n/);

  blocks.forEach((block) => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    let questionText = "";
    const options: string[] = [];
    let correctAnswer = 0;
    let explanation = "";
    let imageRef = "";

    lines.forEach((line) => {
      if (line.startsWith("Q:")) {
        questionText = line.replace(/^Q:\s*/, "").trim();
      } else if (line.startsWith("IMAGE:")) {
        imageRef = line.replace(/^IMAGE:\s*/, "").trim();
      } else if (line.match(/^[A-D]\s*\)/i)) {
        options.push(line.replace(/^[A-D]\s*\)\s*/i, "").trim());
      } else if (line.startsWith("CORRECT:")) {
        const char = line.replace(/^CORRECT:\s*/, "").trim().toUpperCase();
        correctAnswer = char.charCodeAt(0) - 65;
      } else if (/^EXPLAI?NATION:/.test(line)) {
        explanation = line.replace(/^EXPLAI?NATION:\s*/, "").trim();
      }
    });

    if (questionText && options.length === 4) {
      const isUrl = /^https?:\/\//i.test(imageRef);
      const driveId = isUrl ? extractDriveFileId(imageRef) : imageRef;
      questions.push({
        id: questions.length + 1,
        question: questionText,
        options,
        correctAnswer,
        explanation,
        // Drive links (and bare ids) load through the file proxy; other URLs are used directly.
        imageUrl: isUrl && !driveId ? imageRef : undefined,
        imageFileId: driveId || undefined,
      });
    }
  });

  return questions;
}
