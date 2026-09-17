import { useEffect, useState, useMemo } from 'react';
import './App.css'; 
import { FileExplorer } from '@/components/FileExplorer';
import { ViewerModal } from '@/components/ViewerModal';
import { QuizModal } from '@/components/QuizModal';
import type { FileItem, FileSystemNode, FolderItem } from '@/types/file-system';
import { BookOpen, FolderTree, Menu, Search, X, Sparkles, Moon, Sun } from 'lucide-react';
import { RecentAdditionsButton } from './components/RecentAdditionsButton';

interface SocialLink {
  label: string;
  url: string;
  iconUrl: string;
}

export default function App() {
  const [filesData, setFilesData] = useState<FileSystemNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [synonyms, setSynonyms] = useState<Record<string, string[]>>({});
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  
  // Dark mode state with persistence
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    // 1. Fetch Files
    fetch(`${import.meta.env.BASE_URL}files.json`)
      .then((res) => res.json())
      .then((data) => setFilesData(data))
      .catch((err) => console.error('Failed to load files:', err));

    // 2. Fetch Synonyms
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

    // 3. Fetch Social Links & Favicons
    fetch(`${import.meta.env.BASE_URL}socials.txt`)
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split('\n').filter((line) => line.trim() !== '');
        const parsed: SocialLink[] = lines.map((line) => {
          let label = '';
          let url = line.trim();

          // Parse "Label: URL" or "Label: mailto:..." format
          if (line.includes(':')) {
            const match = line.match(/^([^:]+):\s*(.*)$/);
            if (match && (match[2].startsWith('http') || match[2].startsWith('mailto:'))) {
              label = match[1].trim();
              url = match[2].trim();
            }
          }

          // Handle mailto: links
          if (url.startsWith('mailto:')) {
            const domain = url.split('@')[1] || 'gmail.com';
            return {
              label: label || 'Email',
              url,
              iconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
            };
          }

          // Handle HTTP / HTTPS links
          try {
            const parsedUrl = new URL(url);
            const domain = parsedUrl.hostname;
            return {
              label: label || domain.replace('www.', ''),
              url,
              iconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
            };
          } catch {
            return {
              label: label || url,
              url,
              iconUrl: `https://www.google.com/s2/favicons?domain=${url}&sz=64`,
            };
          }
        });

        setSocialLinks(parsed);
      })
      .catch((err) => console.error('Failed to load socials:', err));
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

    const matchesAllTerms = (path: string): boolean => {
      const lowerPath = path.toLowerCase();
      return terms.every((term) => {
        const variants = [term, ...(synonyms[term] || [])];
        return variants.some((variant) => lowerPath.includes(variant));
      });
    };

    const filterNode = (node: FileSystemNode, parentPath = ''): FileSystemNode | null => {
      const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

      if (node.type === 'folder') {
        const folder = node as FolderItem;

        const matchingChildren = folder.children
          .map((child) => filterNode(child, currentPath))
          .filter((child): child is FileSystemNode => child !== null);

        if (matchingChildren.length > 0) {
          return {
            ...folder,
            children: matchingChildren,
          };
        }
        return null;
      }

      const file = node as FileItem;
      const fullPath = (file as FileItem & { path?: string }).path || currentPath;

      return matchesAllTerms(fullPath) ? file : null;
    };

    return filesData
      .map((node) => filterNode(node))
      .filter((node): node is FileSystemNode => node !== null);
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-xs"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Collapsible Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-r border-slate-200/80 dark:border-slate-800 flex flex-col h-full transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-80 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 overflow-hidden'
        }`}
      >
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h1 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate">ICSE Resources</h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
            title="Collapse sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search (e.g. pyq, physics)..."
              className="w-full pl-9 pr-8 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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

        {/* Bottom Quiz Button */}
        <div className="sticky bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white/95 dark:from-slate-900/95 via-white/90 dark:via-slate-900/90 to-transparent border-t border-slate-100 dark:border-slate-800 z-10 shrink-0">
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
        <header className="h-14 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400 md:hidden" />
              <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm md:text-base">Resource Portal</span>
            </div>
          </div>

          {/* Stats Counter */}
          {stats.fileCount > 0 && (
            <div className="flex items-center gap-1.5 md:gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-1.5 rounded-full font-medium whitespace-nowrap">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{stats.fileCount} files</span>
              </div>
              <div className="flex items-center gap-1 bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 px-2.5 py-1.5 rounded-full font-medium whitespace-nowrap">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 3 8 3s8-.79 8-3V7M4 7c0-2.21 3.582-3 8-3s8 .79 8-3M4 7c0-2.21 3.582-3 8-3s8 .79 8-3" />
                </svg>
                <span>{stats.totalMB} MB</span>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
          <div className="max-w-md space-y-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800 transition-colors">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mx-auto">
              <FolderTree className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Select a document to view</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Use the sidebar search or browse subjects to view built-in PDFs, images, and notes.
            </p>
          </div>
        </main>
      </div>

      {/* Floating Stack: Recent Additions (i) Button + Dark Theme Toggle Button */}
      <div className="fixed top-16 right-4 z-20 md:top-16 md:right-6 flex flex-col items-center gap-2.5">
        <RecentAdditionsButton />
        
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="w-10 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle dark theme"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </button>
      </div>

      {/* Floating Social Icons Bar */}
      {socialLinks.length > 0 && (
        <div className="social-bar">
          {socialLinks.map((item, index) => (
            <a
              key={index}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="social-bar-icon"
              title={item.label}
              aria-label={item.label}
            >
              <img src={item.iconUrl} alt={item.label} />
            </a>
          ))}
        </div>
      )}

      {/* Modals */}
      <ViewerModal file={selectedFile} onClose={() => setSelectedFile(null)} />
      <QuizModal isOpen={isQuizModalOpen} onClose={() => setIsQuizModalOpen(false)} />
    </div>
  );
}
