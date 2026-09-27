import type { Question } from "../types";

/** A Drive file id resolves to Drive's public thumbnail endpoint; a full URL passes through as-is. */
function resolveImageUrl(ref: string): string {
  if (/^https?:\/\//i.test(ref)) return ref;
  return `https://drive.google.com/thumbnail?id=${ref}&sz=w1600`;
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
      } else if (line.startsWith("EXPLANATION:")) {
        explanation = line.replace(/^EXPLANATION:\s*/, "").trim();
      }
    });

    if (questionText && options.length === 4) {
      questions.push({
        id: questions.length + 1,
        question: questionText,
        options,
        correctAnswer,
        explanation,
        imageUrl: imageRef ? resolveImageUrl(imageRef) : undefined,
      });
    }
  });

  return questions;
}
