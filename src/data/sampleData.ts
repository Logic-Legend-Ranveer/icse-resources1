import type { FileItem } from "../types";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * Mirrors the real Drive layout:
 *
 *   icse-resources-webpage/
 *     ├── quizzes/                          → CONTENT_TREES.quizzes
 *     └── icse-resources-files/
 *           ├── ICSE 2027 Syllabus/         → CONTENT_TREES.syllabus
 *           ├── Study Assets/               → CONTENT_TREES.study
 *           └── CISCE Sample Papers & PYQs/ → CONTENT_TREES["sample-papers"]
 *
 * Every folder directly under one of those four is a "card" on the
 * contents-bar for that tab. "About" has no folder — it's a static tab.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type TabId = "syllabus" | "study" | "quizzes" | "sample-papers" | "about";

export interface TabDef {
  id: TabId;
  label: string;
}

export const TAB_DEFS: TabDef[] = [
  { id: "syllabus", label: "ICSE 2027 Syllabus" },
  { id: "study", label: "Study Assets" },
  { id: "quizzes", label: "Interactive Quizzes" },
  { id: "sample-papers", label: "CISCE Sample Papers & PYQs" },
  { id: "about", label: "About" },
];

export const CLASS_LABELS: Record<string, string> = {
  "class-10": "Class 10",
  "class-9": "Class 9",
};

type TreeTabId = Exclude<TabId, "about">;

/**
 * ICSE 2027 Syllabus — one syllabus document per subject.
 */
const SYLLABUS_CLASS_10: FileItem[] = [
  {
    id: "syllabus-10-biology",
    name: "Biology",
    type: "folder",
    children: [
      {
        id: "syllabus-10-biology-doc",
        name: "Biology Syllabus 2026-27.pdf",
        type: "file",
        mimeType: "application/pdf",
        driveId: "1Syllabus10BiologyDriveId",
        sizeLabel: "620 KB",
        updatedAt: "1 month ago",
      },
    ],
  },
  {
    id: "syllabus-10-chemistry",
    name: "Chemistry",
    type: "folder",
    children: [
      {
        id: "syllabus-10-chemistry-doc",
        name: "Chemistry Syllabus 2026-27.pdf",
        type: "file",
        mimeType: "application/pdf",
        driveId: "1Syllabus10ChemistryDriveId",
        sizeLabel: "580 KB",
        updatedAt: "1 month ago",
      },
    ],
  },
  {
    id: "syllabus-10-physics",
    name: "Physics",
    type: "folder",
    children: [
      {
        id: "syllabus-10-physics-doc",
        name: "Physics Syllabus 2026-27.pdf",
        type: "file",
        mimeType: "application/pdf",
        driveId: "1Syllabus10PhysicsDriveId",
        sizeLabel: "540 KB",
        updatedAt: "1 month ago",
      },
    ],
  },
  {
    id: "syllabus-10-mathematics",
    name: "Mathematics",
    type: "folder",
    children: [
      {
        id: "syllabus-10-mathematics-doc",
        name: "Mathematics Syllabus 2026-27.pdf",
        type: "file",
        mimeType: "application/pdf",
        driveId: "1Syllabus10MathematicsDriveId",
        sizeLabel: "610 KB",
        updatedAt: "1 month ago",
      },
    ],
  },
  { id: "syllabus-10-english", name: "English", type: "folder", children: [] },
  { id: "syllabus-10-history-civics", name: "History & Civics", type: "folder", children: [] },
];

const SYLLABUS_CLASS_9: FileItem[] = [
  {
    id: "syllabus-9-biology",
    name: "Biology",
    type: "folder",
    children: [
      {
        id: "syllabus-9-biology-doc",
        name: "Biology Syllabus 2026-27.pdf",
        type: "file",
        mimeType: "application/pdf",
        driveId: "1Syllabus9BiologyDriveId",
        sizeLabel: "590 KB",
        updatedAt: "1 month ago",
      },
    ],
  },
  { id: "syllabus-9-chemistry", name: "Chemistry", type: "folder", children: [] },
  { id: "syllabus-9-physics", name: "Physics", type: "folder", children: [] },
  { id: "syllabus-9-mathematics", name: "Mathematics", type: "folder", children: [] },
  { id: "syllabus-9-english", name: "English", type: "folder", children: [] },
  { id: "syllabus-9-history-civics", name: "History & Civics", type: "folder", children: [] },
];

/**
 * Study Assets — notes, worksheets, diagrams, organized by subject → chapter.
 */
const STUDY_CLASS_10: FileItem[] = [
  {
    id: "study-10-biology",
    name: "Biology",
    type: "folder",
    children: [
      {
        id: "study-10-bio-cell",
        name: "Cell Structure & Function",
        type: "folder",
        children: [
          {
            id: "study-10-bio-cell-notes",
            name: "Chapter Notes.pdf",
            type: "file",
            mimeType: "application/pdf",
            driveId: "1BioCellNotesDriveId",
            sizeLabel: "2.1 MB",
            updatedAt: "3 days ago",
          },
          {
            id: "study-10-bio-cell-diagram",
            name: "Cell Diagram Labelled.png",
            type: "file",
            mimeType: "image/png",
            driveId: "1BioCellDiagramDriveId",
            sizeLabel: "480 KB",
            updatedAt: "3 days ago",
          },
        ],
      },
      {
        id: "study-10-bio-photo",
        name: "Photosynthesis",
        type: "folder",
        children: [
          {
            id: "study-10-bio-photo-notes",
            name: "Photosynthesis Notes.pdf",
            type: "file",
            mimeType: "application/pdf",
            driveId: "1BioPhotoNotesDriveId",
            sizeLabel: "1.8 MB",
            updatedAt: "1 week ago",
          },
          {
            id: "study-10-bio-photo-worksheet",
            name: "Practice Worksheet.pdf",
            type: "file",
            mimeType: "application/pdf",
            driveId: "1BioPhotoWorksheetDriveId",
            sizeLabel: "620 KB",
            updatedAt: "1 week ago",
          },
        ],
      },
    ],
  },
  {
    id: "study-10-chemistry",
    name: "Chemistry",
    type: "folder",
    children: [
      {
        id: "study-10-chem-periodic",
        name: "Periodic Table",
        type: "folder",
        children: [
          {
            id: "study-10-chem-periodic-notes",
            name: "Periodicity Notes.pdf",
            type: "file",
            mimeType: "application/pdf",
            driveId: "1ChemPeriodicNotesDriveId",
            sizeLabel: "2.4 MB",
            updatedAt: "2 days ago",
          },
        ],
      },
      {
        id: "study-10-chem-bonding",
        name: "Chemical Bonding",
        type: "folder",
        children: [
          {
            id: "study-10-chem-bonding-notes",
            name: "Ionic & Covalent Bonds.pdf",
            type: "file",
            mimeType: "application/pdf",
            driveId: "1ChemBondingNotesDriveId",
            sizeLabel: "1.5 MB",
            updatedAt: "5 days ago",
          },
        ],
      },
    ],
  },
  {
    id: "study-10-physics",
    name: "Physics",
    type: "folder",
    children: [
      {
        id: "study-10-phy-motion",
        name: "Motion in One Dimension",
        type: "folder",
        children: [
          {
            id: "study-10-phy-motion-notes",
            name: "Equations of Motion.pdf",
            type: "file",
            mimeType: "application/pdf",
            driveId: "1PhyMotionNotesDriveId",
            sizeLabel: "1.2 MB",
            updatedAt: "4 days ago",
          },
        ],
      },
      {
        id: "study-10-phy-force",
        name: "Force, Work & Power",
        type: "folder",
        children: [
          {
            id: "study-10-phy-force-notes",
            name: "Force and Pressure.pdf",
            type: "file",
            mimeType: "application/pdf",
            driveId: "1PhyForceNotesDriveId",
            sizeLabel: "1.9 MB",
            updatedAt: "6 days ago",
          },
        ],
      },
    ],
  },
  {
    id: "study-10-mathematics",
    name: "Mathematics",
    type: "folder",
    children: [
      {
        id: "study-10-math-algebra",
        name: "Algebra",
        type: "folder",
        children: [
          {
            id: "study-10-math-algebra-notes",
            name: "Quadratic Equations.pdf",
            type: "file",
            mimeType: "application/pdf",
            driveId: "1MathAlgebraNotesDriveId",
            sizeLabel: "980 KB",
            updatedAt: "2 days ago",
          },
        ],
      },
      {
        id: "study-10-math-geometry",
        name: "Geometry",
        type: "folder",
        children: [
          {
            id: "study-10-math-geometry-notes",
            name: "Circle Theorems.pdf",
            type: "file",
            mimeType: "application/pdf",
            driveId: "1MathGeometryNotesDriveId",
            sizeLabel: "1.1 MB",
            updatedAt: "1 week ago",
          },
        ],
      },
    ],
  },
  { id: "study-10-english", name: "English", type: "folder", children: [] },
  { id: "study-10-history-civics", name: "History & Civics", type: "folder", children: [] },
];

const STUDY_CLASS_9: FileItem[] = [
  {
    id: "study-9-biology",
    name: "Biology",
    type: "folder",
    children: [
      {
        id: "study-9-bio-basics",
        name: "Basic Biology Concepts",
        type: "folder",
        children: [
          {
            id: "study-9-bio-basics-notes",
            name: "Introduction to Life Processes.pdf",
            type: "file",
            mimeType: "application/pdf",
            driveId: "1Bio9BasicsNotesDriveId",
            sizeLabel: "1.4 MB",
            updatedAt: "2 weeks ago",
          },
        ],
      },
    ],
  },
  { id: "study-9-chemistry", name: "Chemistry", type: "folder", children: [] },
  { id: "study-9-physics", name: "Physics", type: "folder", children: [] },
  { id: "study-9-mathematics", name: "Mathematics", type: "folder", children: [] },
  { id: "study-9-english", name: "English", type: "folder", children: [] },
  { id: "study-9-history-civics", name: "History & Civics", type: "folder", children: [] },
];

/**
 * Interactive Quizzes — subject → chapter → individual quiz. Each leaf
 * "file" is one quiz; its driveId is the fileId passed to fetchQuizData().
 */
const QUIZZES_CLASS_10: FileItem[] = [
  {
    id: "quizzes-10-biology",
    name: "Biology",
    type: "folder",
    children: [
      {
        id: "quizzes-10-bio-photo",
        name: "Photosynthesis",
        type: "folder",
        children: [
          {
            id: "quizzes-10-bio-photo-quiz",
            name: "Photosynthesis — Quick Check",
            type: "file",
            driveId: "1QuizBioPhotosynthesisFileId",
          },
        ],
      },
      {
        id: "quizzes-10-bio-resp",
        name: "Respiration",
        type: "folder",
        children: [
          {
            id: "quizzes-10-bio-resp-quiz",
            name: "Respiration Basics",
            type: "file",
            driveId: "1QuizBioRespirationFileId",
          },
        ],
      },
    ],
  },
  {
    id: "quizzes-10-chemistry",
    name: "Chemistry",
    type: "folder",
    children: [
      {
        id: "quizzes-10-chem-periodic",
        name: "Periodic Table",
        type: "folder",
        children: [
          {
            id: "quizzes-10-chem-periodic-quiz",
            name: "Periodicity & Trends",
            type: "file",
            driveId: "1QuizChemPeriodicFileId",
          },
        ],
      },
    ],
  },
  { id: "quizzes-10-physics", name: "Physics", type: "folder", children: [] },
  { id: "quizzes-10-mathematics", name: "Mathematics", type: "folder", children: [] },
  { id: "quizzes-10-english", name: "English", type: "folder", children: [] },
  { id: "quizzes-10-history-civics", name: "History & Civics", type: "folder", children: [] },
];

const QUIZZES_CLASS_9: FileItem[] = [
  { id: "quizzes-9-biology", name: "Biology", type: "folder", children: [] },
  { id: "quizzes-9-chemistry", name: "Chemistry", type: "folder", children: [] },
  { id: "quizzes-9-physics", name: "Physics", type: "folder", children: [] },
  { id: "quizzes-9-mathematics", name: "Mathematics", type: "folder", children: [] },
  { id: "quizzes-9-english", name: "English", type: "folder", children: [] },
  { id: "quizzes-9-history-civics", name: "History & Civics", type: "folder", children: [] },
];

/**
 * CISCE Sample Papers & PYQs — subject → specimen papers / past year papers.
 */
const SAMPLE_PAPERS_CLASS_10: FileItem[] = [
  {
    id: "sample-10-physics",
    name: "Physics",
    type: "folder",
    children: [
      {
        id: "sample-10-physics-specimen",
        name: "Specimen Paper 2026.pdf",
        type: "file",
        mimeType: "application/pdf",
        driveId: "1Sample10PhysicsSpecimenDriveId",
        sizeLabel: "2.8 MB",
        updatedAt: "1 month ago",
      },
      {
        id: "sample-10-physics-pyq-2025",
        name: "2025 PYQ.pdf",
        type: "file",
        mimeType: "application/pdf",
        driveId: "1Sample10PhysicsPyq2025DriveId",
        sizeLabel: "2.5 MB",
        updatedAt: "5 months ago",
      },
    ],
  },
  {
    id: "sample-10-mathematics",
    name: "Mathematics",
    type: "folder",
    children: [
      {
        id: "sample-10-maths-specimen",
        name: "Specimen Paper 2026.pdf",
        type: "file",
        mimeType: "application/pdf",
        driveId: "1Sample10MathsSpecimenDriveId",
        sizeLabel: "2.2 MB",
        updatedAt: "1 month ago",
      },
      {
        id: "sample-10-maths-pyq-2025",
        name: "2025 PYQ.pdf",
        type: "file",
        mimeType: "application/pdf",
        driveId: "1Sample10MathsPyq2025DriveId",
        sizeLabel: "2.0 MB",
        updatedAt: "5 months ago",
      },
    ],
  },
  { id: "sample-10-biology", name: "Biology", type: "folder", children: [] },
  { id: "sample-10-chemistry", name: "Chemistry", type: "folder", children: [] },
  { id: "sample-10-english", name: "English", type: "folder", children: [] },
  { id: "sample-10-history-civics", name: "History & Civics", type: "folder", children: [] },
];

const SAMPLE_PAPERS_CLASS_9: FileItem[] = [
  { id: "sample-9-biology", name: "Biology", type: "folder", children: [] },
  { id: "sample-9-chemistry", name: "Chemistry", type: "folder", children: [] },
  { id: "sample-9-physics", name: "Physics", type: "folder", children: [] },
  { id: "sample-9-mathematics", name: "Mathematics", type: "folder", children: [] },
  { id: "sample-9-english", name: "English", type: "folder", children: [] },
  { id: "sample-9-history-civics", name: "History & Civics", type: "folder", children: [] },
];

export const CONTENT_TREES: Record<TreeTabId, Record<string, FileItem[]>> = {
  syllabus: { "class-10": SYLLABUS_CLASS_10, "class-9": SYLLABUS_CLASS_9 },
  study: { "class-10": STUDY_CLASS_10, "class-9": STUDY_CLASS_9 },
  quizzes: { "class-10": QUIZZES_CLASS_10, "class-9": QUIZZES_CLASS_9 },
  "sample-papers": { "class-10": SAMPLE_PAPERS_CLASS_10, "class-9": SAMPLE_PAPERS_CLASS_9 },
};

/**
 * Standalone feed for the "Recent Additions" panel — always opens via the
 * regular viewer, so it intentionally only references non-quiz files.
 */
export const RECENT_ADDITIONS: FileItem[] = [
  {
    id: "study-10-bio-cell-notes",
    name: "Chapter Notes.pdf",
    type: "file",
    mimeType: "application/pdf",
    driveId: "1BioCellNotesDriveId",
    sizeLabel: "2.1 MB",
    updatedAt: "3 days ago",
  },
  {
    id: "sample-10-physics-specimen",
    name: "Specimen Paper 2026.pdf",
    type: "file",
    mimeType: "application/pdf",
    driveId: "1Sample10PhysicsSpecimenDriveId",
    sizeLabel: "2.8 MB",
    updatedAt: "1 month ago",
  },
  {
    id: "syllabus-10-mathematics-doc",
    name: "Mathematics Syllabus 2026-27.pdf",
    type: "file",
    mimeType: "application/pdf",
    driveId: "1Syllabus10MathematicsDriveId",
    sizeLabel: "610 KB",
    updatedAt: "1 month ago",
  },
];
