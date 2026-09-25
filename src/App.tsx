import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { UIProvider, useUI } from "./context/UIContext";
import { TAB_LABELS } from "./data/tabs";
import type { TabId, TreeTabId } from "./data/tabs";
import { TAB_SOURCE_FOLDER_NAME } from "./data/tabs";
import type { FileItem } from "./types";
import { fetchFilesJson, fetchQuizManifest, fetchSynonyms } from "./lib/api";
import { buildQuizTree, countFiles, findFolderChildren, getRecentRawFiles, normalizeFileTree } from "./lib/fileTree";
import { buildSearchIndex, buildTermGroups, matchesTermGroups } from "./lib/search";
import type { SearchEntry } from "./lib/search";
import Navbar from "./components/layout/Navbar";
import MobileTabDrawer from "./components/layout/MobileTabDrawer";
import ContentsBar from "./components/layout/ContentsBar";
import Hero from "./components/workspace/Hero";
import ClassSelector from "./components/workspace/ClassSelector";
import FileExplorer from "./components/workspace/FileExplorer";
import SearchResultsView from "./components/workspace/SearchResultsView";
import AboutPanel from "./components/workspace/AboutPanel";
import RecentAdditionsButton from "./components/floating/RecentAdditionsButton";
import QuizSelectionBar from "./components/floating/QuizSelectionBar";
import ViewerModal from "./components/modals/ViewerModal";
import QuizModal from "./components/modals/QuizModal";
import RecentAdditionsModal from "./components/modals/RecentAdditionsModal";

const DEFAULT_TAB_ID: TabId = "syllabus";
const EMPTY_TREES: Record<TreeTabId, FileItem[]> = { syllabus: [], study: [], quizzes: [], "sample-papers": [] };

type DataStatus = "loading" | "ready" | "error";

function AppShell() {
  const { activeModal, openViewer, openQuiz } = useUI();

  const [dataStatus, setDataStatus] = useState<DataStatus>("loading");
  const [dataError, setDataError] = useState("");
  const [contentTrees, setContentTrees] = useState<Record<TreeTabId, FileItem[]>>(EMPTY_TREES);
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [synonyms, setSynonyms] = useState<Record<string, string[]>>({});

  const [activeTabId, setActiveTabId] = useState<TabId>(DEFAULT_TAB_ID);
  const [explorerPath, setExplorerPath] = useState<FileItem[]>([]);
  const [selectedQuizIds, setSelectedQuizIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchFilesJson(), fetchQuizManifest(), fetchSynonyms()])
      .then(([rawFiles, rawQuizzes, syn]) => {
        if (cancelled) return;
        const normalizedRoot = normalizeFileTree(rawFiles);
        setContentTrees({
          syllabus: findFolderChildren(normalizedRoot, TAB_SOURCE_FOLDER_NAME.syllabus),
          study: findFolderChildren(normalizedRoot, TAB_SOURCE_FOLDER_NAME.study),
          "sample-papers": findFolderChildren(normalizedRoot, TAB_SOURCE_FOLDER_NAME["sample-papers"]),
          quizzes: buildQuizTree(rawQuizzes),
        });
        setRecentFiles(normalizeFileTree(getRecentRawFiles(rawFiles, 5)));
        setSynonyms(syn);
        setDataStatus("ready");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setDataError(err.message || "Failed to load site content.");
        setDataStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Selecting quizzes only makes sense within the folder currently being
  // browsed — clear it on any navigation so a stale selection can't carry
  // across subjects or tabs.
  useEffect(() => {
    setSelectedQuizIds(new Set());
  }, [activeTabId, explorerPath]);

  const searchIndex = useMemo(() => buildSearchIndex(contentTrees), [contentTrees]);
  const isSearching = searchQuery.trim().length > 0;
  const searchResults = useMemo<SearchEntry[]>(() => {
    if (!isSearching) return [];
    const termGroups = buildTermGroups(searchQuery, synonyms);
    return searchIndex.filter((entry) => matchesTermGroups(entry, termGroups)).slice(0, 100);
  }, [isSearching, searchQuery, synonyms, searchIndex]);

  function handleSelectTab(tabId: TabId) {
    setSearchQuery("");
    setActiveTabId(tabId);
    setExplorerPath([]);
  }

  function handleSelectCard(cardId: string) {
    setSearchQuery("");
    const card = contentsBarItems.find((c) => c.id === cardId);
    if (card) setExplorerPath([card]);
  }

  function handleOpenFolder(item: FileItem) {
    setExplorerPath((prev) => [...prev, item]);
  }

  function handleGoToCrumb(index: number) {
    setExplorerPath((prev) => prev.slice(0, index + 1));
  }

  function handleToggleQuizSelect(item: FileItem) {
    setSelectedQuizIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  function handleAttemptSelectedQuizzes() {
    const selected = currentItems.filter((item) => item.type === "file" && selectedQuizIds.has(item.id));
    if (selected.length > 0) openQuiz(selected);
  }

  function handleSelectSearchResult(entry: SearchEntry) {
    if (entry.item.type === "file") {
      if (entry.tabId === "quizzes") {
        openQuiz([entry.item]);
      } else {
        openViewer(entry.item);
      }
      return;
    }
    setSearchQuery("");
    setActiveTabId(entry.tabId);
    setExplorerPath([...entry.ancestors, entry.item]);
  }

  const tabRootItems = activeTabId === "about" ? [] : contentTrees[activeTabId] ?? [];
  const contentsBarItems = tabRootItems.filter((item) => item.type === "folder");
  const activeCardId = explorerPath[0]?.id ?? null;
  const currentItems = explorerPath.length === 0 ? tabRootItems : explorerPath[explorerPath.length - 1].children ?? [];

  const totalResources = useMemo(() => {
    return (Object.keys(contentTrees) as TreeTabId[]).reduce((total, tabId) => total + countFiles(contentTrees[tabId]), 0);
  }, [contentTrees]);

  const showAboutOnly = activeTabId === "about" && !isSearching;
  const isQuizTab = activeTabId === "quizzes";

  return (
    <div className="min-h-screen bg-midnight">
      <Navbar activeTabId={activeTabId} onSelectTab={handleSelectTab} searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
      <MobileTabDrawer activeTabId={activeTabId} onSelectTab={handleSelectTab} />
      <ContentsBar variant="sidebar" items={contentsBarItems} activeId={activeCardId} onSelect={handleSelectCard} />

      <main className="pt-16 md:pl-64 md:pt-[108px]">
        <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
          {dataStatus === "loading" && (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 pt-20 text-center text-slate-500 md:pt-14">
              <Loader2 className="h-6 w-6 animate-spin text-accent-indigo-soft" />
              <p className="text-sm">Loading resources…</p>
            </div>
          )}

          {dataStatus === "error" && (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 pt-20 text-center text-slate-500 md:pt-14">
              <AlertTriangle className="h-6 w-6 text-danger" />
              <p className="text-sm">{dataError}</p>
            </div>
          )}

          {dataStatus === "ready" &&
            (showAboutOnly ? (
              <AboutPanel />
            ) : (
              <>
                <Hero resourceCount={totalResources} />
                <ClassSelector />
                <ContentsBar variant="inline" items={contentsBarItems} activeId={activeCardId} onSelect={handleSelectCard} />

                {isSearching ? (
                  <SearchResultsView query={searchQuery} results={searchResults} onSelect={handleSelectSearchResult} />
                ) : (
                  <FileExplorer
                    rootItems={tabRootItems}
                    rootLabel={TAB_LABELS[activeTabId]}
                    path={explorerPath}
                    onOpenFolder={handleOpenFolder}
                    onGoToCrumb={handleGoToCrumb}
                    onOpenFile={openViewer}
                    selectionMode={isQuizTab}
                    selectedIds={selectedQuizIds}
                    onToggleSelect={handleToggleQuizSelect}
                  />
                )}
              </>
            ))}
        </div>
      </main>

      <RecentAdditionsButton />
      {isQuizTab && !isSearching && <QuizSelectionBar count={selectedQuizIds.size} onAttempt={handleAttemptSelectedQuizzes} />}

      {activeModal === "viewer" && <ViewerModal />}
      {activeModal === "quiz" && <QuizModal />}
      {activeModal === "recent" && <RecentAdditionsModal recentFiles={recentFiles} />}
    </div>
  );
}

export default function App() {
  return (
    <UIProvider>
      <AppShell />
    </UIProvider>
  );
}
