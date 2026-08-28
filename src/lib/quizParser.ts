import type { Question } from '@/types/quiz';

export function parseQuizTxt(text: string): Question[] {
  const questions: Question[] = [];
  
  // Normalize line endings and split by blocks of text separated by blank lines
  const normalizedText = text.replace(/\r\n/g, '\n');
  const blocks = normalizedText.split(/\n\s*\n/);

  blocks.forEach((block, index) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    let questionText = '';
    const options: string[] = [];
    let correctAnswer = 0;
    let explanation = '';

    lines.forEach((line) => {
      if (line.startsWith('Q:')) {
        questionText = line.replace(/^Q:\s*/, '');
      } else if (line.match(/^[A-D]\)/)) {
        options.push(line.replace(/^[A-D]\)\s*/, ''));
      } else if (line.startsWith('CORRECT:')) {
        const char = line.replace(/^CORRECT:\s*/, '').trim().toUpperCase();
        correctAnswer = char.charCodeAt(0) - 65; // 'A'->0, 'B'->1, etc.
      } else if (line.startsWith('EXPLANATION:')) {
        explanation = line.replace(/^EXPLANATION:\s*/, '');
      }
    });

    if (questionText && options.length === 4) {
      questions.push({
        id: index + 1,
        question: questionText,
        options,
        correctAnswer,
        explanation,
      });
    }
  });

  return questions;
}