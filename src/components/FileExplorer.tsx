import React, { useState, useEffect } from 'react';
import type { FileItem, FileSystemNode, FolderItem } from '@/types/file-system';
import { Folder, FolderOpen, FileText, Image as ImageIcon, File, ChevronRight, ChevronDown } from 'lucide-react';

interface FileExplorerProps {
  data: FileSystemNode[];
  onSelectFile: (file: FileItem) => void;
  searchQuery?: string;
}

const NodeItem: React.FC<{ 
  node: FileSystemNode; 
  onSelectFile: (file: FileItem) => void; 
  searchQuery: string;
}> = ({ node, onSelectFile, searchQuery }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-expand folders when searching
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setIsOpen(true);
    }
  }, [searchQuery]);

  if (node.type === 'folder') {
    const folderNode = node as FolderItem;
    if (folderNode.children.length === 0) return null;

    return (
      // REDUCED: Changed pl-3 to pl-1
      <div className="pl-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 w-full text-left py-1.5 px-1 hover:bg-slate-100 rounded-md text-sm font-medium text-slate-700 transition-colors cursor-pointer"
        >
          {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
          {isOpen ? <FolderOpen className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" /> : <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />}
          <span className="truncate">{folderNode.name}</span>
        </button>
        {isOpen && (
          // REDUCED: Changed ml-4 to ml-2
          <div className="border-l border-slate-200 ml-2">
            {folderNode.children.map((child, idx) => (
              <NodeItem key={idx} node={child} onSelectFile={onSelectFile} searchQuery={searchQuery} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const fileNode = node as FileItem;
  return (
    // REDUCED: Changed pl-3 to pl-1
    <div className="pl-1">
      <button
        onClick={() => onSelectFile(fileNode)}
        className="flex items-center gap-1.5 w-full text-left py-1.5 px-1 ml-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-md text-sm text-slate-600 transition-colors cursor-pointer group"
      >
        {fileNode.type === 'pdf' && <FileText className="w-4 h-4 text-red-500 shrink-0" />}
        {fileNode.type === 'image' && <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />}
        {fileNode.type === 'file' && <File className="w-4 h-4 text-slate-400 shrink-0" />}
        <span className="truncate group-hover:font-medium">{fileNode.name}</span>
      </button>
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({ data, onSelectFile, searchQuery = '' }) => {
  if (data.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-400">
        No matching files found.
      </div>
    );
  }

  return (
    <div className="w-full space-y-1">
      {data.map((node, idx) => (
        <NodeItem key={idx} node={node} onSelectFile={onSelectFile} searchQuery={searchQuery} />
      ))}
    </div>
  );
};
