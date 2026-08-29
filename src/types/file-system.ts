export interface FileItem {
  name: string;
  type: 'pdf' | 'image' | 'file';
  fileId: string;
}

export interface FolderItem {
  name: string;
  type: 'folder';
  children: (FileItem | FolderItem)[];
}

export type FileSystemNode = FileItem | FolderItem;
