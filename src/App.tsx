import { useEffect, useState, useMemo, useRef } from 'react';
import './App.css'; 
import { FileExplorer } from '@/components/FileExplorer';
import { ViewerModal } from '@/components/ViewerModal';
import { QuizModal } from '@/components/QuizModal';
import type { FileItem, FileSystemNode, FolderItem } from '@/types/file-system';
import { BookOpen, FolderTree, Menu, Search, X, Sparkles, Moon, Sun, Info, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SocialLink {
  label: string;
  url: string;
  iconUrl: string;
}

interface FileData {
  fileId?: string;
  name?: string;
  type?: string;
  size?: number;
  addedAt?: string;
  children?: FileData[];
}

function getAllFiles(nodes: FileData[]): FileData[] {
  let result: FileData[] = [];
  for (const node of nodes) {
    if (node.type === 'folder' && node.children) {
      result = result.concat(getAllFiles(node.children));
    } else if (node.type !== 'folder') {
      result.push(node);
    }
  }
  return result;
}

export function RecentAdditionsButton() {
  const [open, setOpen] = useState(false);
  const [filesData, setFilesData] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}files.json`)
      .then((res) => res.json())
      .then((data) => setFilesData(data))
      .catch((err) => console.error('Failed to load files for modal:', err));
  }, []);

  const allFiles = getAllFiles(filesData as FileData[]);

  const recentFiles = allFiles
    .filter((file) => Boolean(file.addedAt))
    .sort((a, b) => new Date(b.addedAt!).getTime() - new Date(a.addedAt!).getTime())
    .slice(0, 5);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-10 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-center cursor-pointer"
        title="Recent Additions"
        aria-label="Recent Additions"
      >
        <Info className="w-5 h-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[90vw] bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
          <DialogHeader className="flex flex-row items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 space-y-0">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <DialogTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Recent Additions
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {recentFiles.length > 0 ? (
              recentFiles.map((file, idx) => (
                <div
                  key={file.fileId || idx}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-100 dark:border-slate-700/50 flex items-center gap-3"
                >
                  <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {file.name ?? 'Untitled File'}
                    </p>
                    {file.addedAt && (
                      <p className="text-xs text-slate-400 dark:text-slate-400">{file.addedAt}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">
                No recent additions found.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConstellationBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = Math.min(Math.floor(width / 25), 50);
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: Math.random() * 2 + 1.5,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(79, 70, 229, 0.45)';
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.25 * (1 - dist / 130)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0 bg-transparent" />;
}


export default function App() {
  const [filesData, setFilesData] = useState<FileSystemNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [synonyms, setSynonyms] = useState<Record<string, string[]>>({});
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

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

    fetch(`${import.meta.env.BASE_URL}socials.txt`)
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split('\n').filter((line) => line.trim() !== '');
        const parsed: SocialLink[] = lines.map((line) => {
          let label = '';
          let url = line.trim();

          if (line.includes(':')) {
            const match = line.match(/^([^:]+):\s*(.*)$/);
            if (match && (match[2].startsWith('http') || match[2].startsWith('mailto:'))) {
              label = match[1].trim();
              url = match[2].trim();
            }
          }

          if (url.startsWith('mailto:')) {
            const domain = url.split('@')[1] || 'gmail.com';
            return {
              label: label || 'Email',
              url,
              iconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
            };
          }

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
          return { ...folder, children: matchingChildren };
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
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-transparent dark:bg-slate-950 font-sans transition-colors duration-300">
      
      {!isDarkMode ? (
        <ConstellationBackground />
      ) : (
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 -right-32 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
          <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse [animation-delay:4s]" />
        </div>
      )}

      {/* Main Top Bar */}
      <header className="relative z-30 h-14 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm md:text-base">ICSE Resources</span>
          </div>
        </div>

        {/* Stats counter */}
        {stats.fileCount > 0 && (
          <div className="flex items-center gap-1.5 md:gap-2 text-xs text-slate-500 dark:text-slate-300">
            <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/85 text-indigo-700 dark:text-indigo-300 px-2.5 py-1.5 rounded-full font-medium whitespace-nowrap border border-indigo-100/50 dark:border-indigo-900/50">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{stats.fileCount} files</span>
            </div>
            <div className="flex items-center gap-1 bg-violet-50 dark:bg-violet-950/85 text-violet-700 dark:text-violet-300 px-2.5 py-1.5 rounded-full font-medium whitespace-nowrap border border-violet-100/50 dark:border-violet-900/50">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 3 8 3s8-.79 8-3V7M4 7c0-2.21 3.582-3 8-3s8 .79 8-3M4 7c0-2.21 3.582-3 8-3s8 .79 8-3" />
              </svg>
              <span>{stats.totalMB} MB</span>
            </div>
          </div>
        )}
      </header>

      {/* Body Area */}
      <div className="relative flex-1 flex overflow-hidden w-full">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div
            className="absolute inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-xs"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`absolute md:relative inset-y-0 left-0 z-50 md:z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 flex flex-col h-full transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none ${
            isSidebarOpen ? 'w-80 translate-x-0' : '-translate-x-full md:-ml-80 md:w-80'
          }`}
        >
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search (e.g. pyq, physics)..."
                className="w-full pl-9 pr-8 py-1.5 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
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
          <div className="sticky bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white dark:from-slate-900 via-white/95 dark:via-slate-900/95 to-transparent border-t border-slate-200 dark:border-slate-800 z-10 shrink-0">
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

        {/* Workspace - Updated Card Shadow and Borders for Light Theme */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto bg-transparent">
          <div className="max-w-md space-y-3 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-indigo-950/5 dark:shadow-none transition-colors">
            <div className="w-12 h-12 bg-indigo-100/80 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mx-auto border border-indigo-200/60 dark:border-indigo-900/40 shadow-sm shadow-indigo-100 dark:shadow-none">
              <FolderTree className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Select a document to view</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Use the sidebar search or browse subjects to view built-in PDFs, images, and notes.
            </p>
          </div>
        </main>
      </div>

      {/* Action Buttons */}
      <div className="fixed top-16 right-4 z-30 md:top-16 md:right-6 flex flex-col items-center gap-2.5">
        <RecentAdditionsButton />
        
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="w-10 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle dark theme"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700" />
          )}
        </button>
      </div>

      {/* Social Links */}
      {socialLinks.length > 0 && (
        <div className="fixed bottom-6 right-6 z-30 flex items-center gap-2 p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-full shadow-lg">
          {socialLinks.map((item, index) => (
            <a
              key={index}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-xs flex items-center justify-center hover:scale-110 hover:-translate-y-1 hover:shadow-md transition-all duration-200 p-2"
              title={item.label}
              aria-label={item.label}
            >
              <img src={item.iconUrl} alt={item.label} className="w-full h-full object-contain rounded-full" />
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
