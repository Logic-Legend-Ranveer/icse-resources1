import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { FileItem } from "../types";

type ModalKind = "viewer" | "quiz" | "recent" | null;

interface UIContextValue {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;

  activeModal: ModalKind;
  viewerFile: FileItem | null;
  /** One or more quiz files combined into a single attempt. */
  quizFiles: FileItem[];

  openViewer: (file: FileItem) => void;
  openQuiz: (files: FileItem[]) => void;
  openRecentAdditions: () => void;
  closeModal: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [viewerFile, setViewerFile] = useState<FileItem | null>(null);
  const [quizFiles, setQuizFiles] = useState<FileItem[]>([]);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const openViewer = useCallback((file: FileItem) => {
    setViewerFile(file);
    setActiveModal("viewer");
  }, []);

  const openQuiz = useCallback((files: FileItem[]) => {
    setQuizFiles(files);
    setActiveModal("quiz");
  }, []);

  const openRecentAdditions = useCallback(() => setActiveModal("recent"), []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setViewerFile(null);
    setQuizFiles([]);
  }, []);

  const value = useMemo(
    () => ({
      sidebarOpen,
      toggleSidebar,
      closeSidebar,
      activeModal,
      viewerFile,
      quizFiles,
      openViewer,
      openQuiz,
      openRecentAdditions,
      closeModal,
    }),
    [sidebarOpen, toggleSidebar, closeSidebar, activeModal, viewerFile, quizFiles, openViewer, openQuiz, openRecentAdditions, closeModal]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return ctx;
}
