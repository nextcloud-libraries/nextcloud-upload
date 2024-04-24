// Helpers for the File and Directory API

// Helper to support browser that do not support the API
export const isFileSystemDirectoryEntry = (o: unknown): o is FileSystemDirectoryEntry => 'FileSystemDirectoryEntry' in window && o instanceof FileSystemDirectoryEntry

export const isFileSystemFileEntry = (o: unknown): o is FileSystemFileEntry => 'FilesystemFileEntry' in window && o instanceof FileSystemFileEntry

export const isFileSystemEntry = (o: unknown): o is FileSystemEntry => 'FileSystemEntry' in window && o instanceof FileSystemEntry
