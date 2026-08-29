import type { Question } from '@/types/quiz';

export function parseQuizTxt(text: string): Question[] {
  const questions: Question[] = [];
  
  // Remove BOM and normalize line endings
  const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const blocks = cleanText.split(/\n\s*\n/);

  blocks.forEach((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    let questionText = '';
    const options: string[] = [];
    let correctAnswer = 0;
    let explanation = '';

    lines.forEach((line) => {
      if (line.startsWith('Q:')) {
        questionText = line.replace(/^Q:\s*/, '').trim();
      } else if (line.match(/^[A-D]\s*\)/i)) {
        options.push(line.replace(/^[A-D]\s*\)\s*/i, '').trim());
      } else if (line.startsWith('CORRECT:')) {
        const char = line.replace(/^CORRECT:\s*/, '').trim().toUpperCase();
        correctAnswer = char.charCodeAt(0) - 65;
      } else if (line.startsWith('EXPLANATION:')) {
        explanation = line.replace(/^EXPLANATION:\s*/, '').trim();
      }
    });

    if (questionText && options.length === 4) {
      questions.push({
        id: questions.length + 1,
        question: questionText,
        options,
        correctAnswer,
        explanation,
      });
    }
  });

  return questions;
}
