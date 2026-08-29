export interface FileItem {
  name: string;
  type: 'pdf' | 'image' | 'file';
  fileId: string;
  size?: number; // in bytes, optional so old data doesn't break
}

export interface FolderItem {
  name: string;
  type: 'folder';
  children: (FileItem | FolderItem)[];
}

export type FileSystemNode = FileItem | FolderItem;
