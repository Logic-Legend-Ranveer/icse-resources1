/** Raw shape as it actually appears in files.json — a folder/file tree. */
export interface RawFileItem {
  name: string;
  type: "file" | "folder";
  fileId: string; // empty string for folders
  size: number; // bytes
  addedAt?: string; // e.g. "2026-09-17" (files only)
  children?: RawFileItem[]; // folders only
}

export type FileItemType = "file" | "folder";

/** Normalized shape the UI actually works with (see lib/fileTree.ts for the raw -> this conversion). */
export interface FileItem {
  id: string;
  name: string;
  type: FileItemType;
  driveId: string; // == RawFileItem.fileId; empty for folders
  sizeLabel?: string;
  updatedAt?: string;
  children?: FileItem[];
  /** Only set on synthetic quiz-manifest entries — which subject they belong to. */
  subject?: string;
}

/** What GET {proxy1}/file?id=<fileId> returns. */
export interface FileEmbedResponse {
  url: string;
}

/** One entry in quizzes.json — confirmed flat shape. */
export interface RawQuizManifestEntry {
  id: string;
  subject: string;
  title: string;
  fileId: string;
}

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  /** Direct image URL — set when the .txt's IMAGE: line is a full http(s) URL. */
  imageUrl?: string;
  /** Drive file id — set when the IMAGE: line is a bare id; resolved via the file proxy at render time. */
  imageFileId?: string;
}

export type QuizAttempt = Record<number, number>;
