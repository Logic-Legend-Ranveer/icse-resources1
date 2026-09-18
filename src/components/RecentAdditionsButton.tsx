import React, { useState } from 'react';
import { Info, Sparkles, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Import JSON file data
import filesData from '../../public/files.json';

interface FileData {
  fileId?: string;
  name?: string;
  type?: string;
  size?: number;
  addedAt?: string;
  children?: FileData[];
}

// Recursive helper to extract all files from nested folders
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

export const RecentAdditionsButton: React.FC = () => {
  const [open, setOpen] = useState(false);

  // 1. Flatten nested folders into a single file list
  const allFiles = getAllFiles(filesData as FileData[]);

  // 2. Filter files with addedAt dates, sort newest first, take top 5
  const recentFiles = allFiles
    .filter((file) => Boolean(file.addedAt))
    .sort((a, b) => new Date(b.addedAt!).getTime() - new Date(a.addedAt!).getTime())
    .slice(0, 5);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-10 h-10 bg-white/90 backdrop-blur-md hover:bg-white border border-slate-200 rounded-full shadow-md hover:shadow-lg text-slate-700 hover:text-indigo-600 transition-all flex items-center justify-center cursor-pointer"
        title="Recent Additions"
        aria-label="Recent Additions"
      >
        <Info className="w-5 h-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[90vw] bg-white rounded-2xl p-6 shadow-2xl border border-slate-100">
          <DialogHeader className="flex flex-row items-center gap-2 border-b pb-3 space-y-0">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <DialogTitle className="text-base font-semibold text-slate-800">
              Recent Additions
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {recentFiles.length > 0 ? (
              recentFiles.map((file, idx) => (
                <div
                  key={file.fileId || idx}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition-colors border border-slate-100 flex items-center gap-3"
                >
                  <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {file.name ?? 'Untitled File'}
                    </p>
                    {file.addedAt && (
                      <p className="text-xs text-slate-400">{file.addedAt}</p>
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
};
