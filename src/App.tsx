import { useEffect, useState, useMemo } from 'react';
import { FileExplorer } from '@/components/FileExplorer';
import { ViewerModal } from '@/components/ViewerModal';
import { QuizModal } from '@/components/QuizModal';
import type { FileItem, FileSystemNode, FolderItem } from '@/types/file-system';
import { BookOpen, FolderTree, Menu, Search, X, Sparkles } from 'lucide-react';

export default function App() {
  const [filesData, setFilesData] = useState<FileSystemNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [synonyms, setSynonyms] = useState<Record<string, string[]>>({});
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}files.json`)
      .then((res) => res.json())
      .then((data) => setFilesData(data))
      .catch((err) => console.error('Failed to load files:', err));

    fetch(`${import.meta.env.BASE_URL}synonyms.txt`)
      .then((res) => res.text())
      .then((text) => {
        const mapping: Record<string, string[]> = {};
        text.split('\n').forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;
          const [key, values] = trimmed.split('=');
          if (key && values) {
            mapping[key.trim().toLowerCase()] = values.split(',').map((v) => v.trim().toLowerCase());
          }
        });
        setSynonyms(mapping);
      })
      .catch((err) => console.error('Failed to load synonyms:', err));
  }, []);

  const handleSelectFile = (file: FileItem) => {
    setSelectedFile(file);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return filesData;

    const terms = searchQuery.toLowerCase().trim().split(/\s+/);
    const expandedTerms = terms.flatMap((term) => [term, ...(synonyms[term] || [])]);

    const filterNode = (node: FileSystemNode): FileSystemNode | null => {
      if (node.type === 'folder') {
        const folder = node as FolderItem;
        const matchingChildren = folder.children
          .map(filterNode)
          .filter((child): child is FileSystemNode => child !== null);

        const folderNameMatches = expandedTerms.some((term) => folder.name.toLowerCase().includes(term));
        if (folderNameMatches || matchingChildren.length > 0) {
          return { ...folder, children: folderNameMatches ? folder.children : matchingChildren };
        }
        return null;
      }

      const file = node as FileItem;
      const fileMatches = expandedTerms.some((term) => file.name.toLowerCase().includes(term));
      return fileMatches ? file : null;
    };

    return filesData.map(filterNode).filter((node): node is FileSystemNode => node !== null);
  }, [filesData, searchQuery, synonyms]);

  const stats = useMemo(() => {
    let fileCount = 0;
    let totalBytes = 0;

    const parseSizeBytes = (node: any): number => {
      const val = node.size ?? node.fileSize ?? node.bytes ?? 0;

      if (typeof val === 'number') return val;

      if (typeof val === 'string') {
        const str = val.trim();
        const num = Number(str);
        if (!isNaN(num)) return num;

        // Parse formatted strings like "1.5 MB", "500 KB", "1024 B"
        const match = str.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
        if (match) {
          const amount = parseFloat(match[1]);
          const unit = (match[2] || '').toLowerCase();
          if (unit.startsWith('g')) return amount * 1024 * 1024 * 1024;
          if (unit.startsWith('m')) return amount * 1024 * 1024;
          if (unit.startsWith('k')) return amount * 1024;
          if (unit.startsWith('b') || !unit) return amount;
        }
      }
      return 0;
    };

    const walk = (nodes: FileSystemNode[]) => {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        if (node.type === 'folder') {
          walk((node as FolderItem).children);
        } else {
          fileCount++;
          totalBytes += parseSizeBytes(node);
        }
      }
    };

    walk(filesData);

    const mb = totalBytes / (1024 * 1024);
    return {
      fileCount,
      totalMB: mb < 0.1 && mb > 0 ? mb.toFixed(2) : mb.toFixed(1)
    };
  }, [filesData]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-transparent font-sans">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-xs"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Collapsible Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 bg-white/90 backdrop-blur-md border-r border-slate-200/80 flex flex-col h-full transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-80 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 overflow-hidden'
        }`}
      >
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600 shrink-0" />
            <h1 className="font-bold text-lg text-slate-800 truncate">ICSE Resources</h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
            title="Collapse sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search (e.g. pyq, physics)..."
              className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable File Tree */}
        <div className="flex-1 overflow-y-auto p-2 pb-16">
          <FileExplorer data={filteredFiles} onSelectFile={handleSelectFile} searchQuery={searchQuery} />
        </div>

        {/* Bottom-Left Overlapping Sticky Quiz Button */}
        <div className="sticky bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white/95 via-white/90 to-transparent border-t border-slate-100 z-10 shrink-0">
          <button
            onClick={() => setIsQuizModalOpen(true)}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl shadow-md transition-all flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span className="font-semibold text-sm">Quiz Mode</span>
            </div>
            <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Experimental
            </span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-transparent">
        <header className="h-14 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 md:hidden" />
              <span className="font-semibold text-slate-800 text-sm md:text-base">Resource Portal</span>
            </div>
          </div>

          {/* Stats counter */}
          {stats.fileCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full font-medium">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{stats.fileCount} files</span>
              </div>
              <div className="flex items-center gap-1.5 bg-violet-50 text-violet-700 px-3 py-1.5 rounded-full font-medium">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 3 8 3s8-.79 8-3V7M4 7c0 2.21 3.582 3 8 3s8-.79 8-3M4 7c0-2.21 3.582-3 8-3s8 .79 8 3" />
                </svg>
                <span>{stats.totalMB} MB</span>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
          <div className="max-w-md space-y-3 bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-slate-200/60">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto">
              <FolderTree className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Select a document to view</h2>
            <p className="text-sm text-slate-500">
              Use the sidebar search or browse subjects to view built-in PDFs, images, and notes.
            </p>
          </div>
        </main>
      </div>

      {/* Popup File Viewer Modal */}
      <ViewerModal file={selectedFile} onClose={() => setSelectedFile(null)} />

      {/* Experimental Interactive Quiz Modal */}
      <QuizModal isOpen={isQuizModalOpen} onClose={() => setIsQuizModalOpen(false)} />
    </div>
  );
}
