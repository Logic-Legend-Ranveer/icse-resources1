export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // 0 for A, 1 for B, 2 for C, 3 for D
  explanation: string;
}

export interface QuizChapter {
  id: string;
  name: string;
  subject: string;
  filePath: string;
}