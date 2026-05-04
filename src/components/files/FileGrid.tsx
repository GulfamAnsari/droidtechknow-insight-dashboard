
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, Tag, X, ChevronLeft, ChevronRight, Download, Trash2, ZoomIn } from "lucide-react";
import { getFileIcon, getFileType, getFileTypeLabel, formatFileSize, downloadFile } from "./FileUtils";
import { useSwipeable } from "react-swipeable";
import { useIsMobile } from "@/hooks/use-mobile";

interface FileMetadata {
  format?: string;
  extension?: string;
  size?: number;
  width?: number;
  height?: number;
  documentType?: string;
}

interface FileItem {
  id: string;
  url: string;
  title: string;
  description?: string | null;
  createdAt: string;
  lastModified: string;
  location?: string | null;
  album?: string | null;
  favorite?: boolean;
  fileType: string;
  metadata: FileMetadata;
  thumbnail: string;
}

interface FileGridProps {
  files: FileItem[];
  allFiles?: FileItem[]; // All files for navigation through complete list
  onViewFile?: (file: FileItem) => void;
  onDeleteFile?: (fileId: string) => void;
  gridSize: number;
}

const FileGrid: React.FC<FileGridProps> = ({ files, allFiles, onViewFile, onDeleteFile, gridSize }) => {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const navigableFiles = allFiles || files;
  const isMobile = useIsMobile();
  
  // Initialize swipe handlers regardless of conditions to ensure consistent hook calls
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => navigateFiles('next'),
    onSwipedRight: () => navigateFiles('prev'),
    trackMouse: false
  });
  
  if (!files || files.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No files found.
      </div>
    );
  }

  const handleFileClick = (file: FileItem) => {
    setSelectedFile(file);
    setIsPreviewOpen(true);
    if (onViewFile) {
      onViewFile(file);
    }
  };
  
  const navigateFiles = (direction: 'next' | 'prev') => {
    if (!selectedFile) return;
    
    const currentIndex = navigableFiles.findIndex(f => f.id === selectedFile.id);
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = currentIndex === navigableFiles.length - 1 ? 0 : currentIndex + 1;
    } else {
      newIndex = currentIndex === 0 ? navigableFiles.length - 1 : currentIndex - 1;
    }
    
    setSelectedFile(navigableFiles[newIndex]);
  };
  
  const handleDelete = (fileId: string) => {
    if (onDeleteFile) {
      onDeleteFile(fileId);
      if (selectedFile?.id === fileId) {
        setIsPreviewOpen(false);
      }
    }
  };
  
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {files.map((file) => (
          <div 
            key={file.id}
            className="group relative cursor-pointer"
            onClick={() => handleFileClick(file)}
          >
            <div 
              className="bg-muted rounded-md overflow-hidden flex items-center justify-center border hover:border-primary transition-all"
              style={{ height: `${gridSize}px`, width: '100%' }}
            >
              {file.fileType === 'photo' ? (
                <img 
                  src={file.url.startsWith('http') ? file.thumbnail || file.url : `https://droidtechknow.com/admin/api/files/uploads/${file.thumbnail || file.url}`} 
                  alt={file.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://placehold.co/600x400?text=Error';
                  }}
                />
              ) : file.fileType === 'video' ? (
                <div className="relative h-full w-full bg-black flex items-center justify-center">
                  <FileVideo className="h-10 w-10 text-red-500" />
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  {getFileIcon(file.fileType, file.metadata?.format || '')}
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end items-start p-2 gap-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 rounded-full bg-black/30 text-white hover:bg-black/60"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileClick(file);
                  }}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 rounded-full bg-black/30 text-white hover:bg-black/60"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 rounded-full bg-black/30 text-white hover:bg-black/60"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadFile(file);
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="mt-2">
              <div>
                <p className="text-xs truncate">{file.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {getFileTypeLabel(file.fileType)} • {formatFileSize(file.metadata?.size || 0)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full-screen File Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent
          className="max-w-none w-screen h-[100dvh] sm:h-[95dvh] sm:w-[95vw] sm:max-w-6xl p-0 overflow-hidden border-0 sm:border bg-black sm:bg-background gap-0 rounded-none sm:rounded-lg [&>button]:hidden"
        >
          <DialogTitle className="sr-only">{selectedFile?.title || 'File Preview'}</DialogTitle>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div
              className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b border-white/10 sm:border-border bg-black/80 sm:bg-background text-white sm:text-foreground shrink-0"
              style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
            >
              <h3 className="text-sm sm:text-lg font-semibold truncate flex-1 min-w-0">{selectedFile?.title}</h3>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:hidden text-white hover:bg-white/10"
                  onClick={() => selectedFile && handleDelete(selectedFile.id)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:hidden text-white hover:bg-white/10"
                  onClick={() => selectedFile && downloadFile(selectedFile)}
                  aria-label="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:hidden text-white hover:bg-white/10"
                  onClick={() => setIsPreviewOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => selectedFile && handleDelete(selectedFile.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => selectedFile && downloadFile(selectedFile)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>

            {/* Preview area */}
            <div
              className="relative flex-1 min-h-0 bg-black sm:bg-black/5 overflow-hidden flex items-center justify-center"
              {...swipeHandlers}
            >
              <button
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full z-10 hover:bg-black/60 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center"
                onClick={() => navigateFiles('prev')}
                aria-label="Previous file"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
                {selectedFile?.fileType === 'photo' ? (
                  <img
                    src={selectedFile?.url.startsWith('http') ? selectedFile.url : `https://droidtechknow.com/admin/api/files/${selectedFile.url}`}
                    alt={selectedFile?.title}
                    className="max-h-full max-w-full w-auto h-auto object-contain select-none"
                    draggable={false}
                  />
                ) : selectedFile?.fileType === 'video' ? (
                  <video
                    src={selectedFile?.url.startsWith('http') ? selectedFile.url : `https://droidtechknow.com/admin/api/files/${selectedFile.url}`}
                    controls
                    playsInline
                    className="max-h-full max-w-full w-auto h-auto"
                  />
                ) : selectedFile?.fileType === 'audio' ? (
                  <div className="p-4 sm:p-8 w-full max-w-xl">
                    <audio src={selectedFile?.url.startsWith('http') ? selectedFile.url : `https://droidtechknow.com/admin/api/files/${selectedFile.url}`} controls className="w-full" />
                    <div className="mt-4 flex justify-center text-white">
                      {selectedFile && getFileIcon(selectedFile.fileType, selectedFile.metadata?.format || '')}
                    </div>
                  </div>
                ) : selectedFile?.fileType === 'document' && selectedFile?.metadata?.format === 'application/pdf' ? (
                  <iframe
                    src={`${selectedFile?.url.startsWith('http') ? selectedFile.url : `https://droidtechknow.com/admin/api/files/${selectedFile.url}`}#toolbar=0`}
                    className="w-full h-full bg-white"
                    title={selectedFile?.title}
                  />
                ) : (
                  <div className="text-center p-8 text-white sm:text-foreground">
                    <div className="flex justify-center mb-4">
                      {selectedFile && getFileIcon(selectedFile.fileType, selectedFile.metadata?.format || '')}
                    </div>
                    <p>Preview not available for this file type</p>
                    <p className="text-sm opacity-70 mt-2">
                      {selectedFile && getFileTypeLabel(selectedFile.fileType)} - {selectedFile && formatFileSize(selectedFile.metadata.size || 0)}
                    </p>
                  </div>
                )}
              </div>

              <button
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full z-10 hover:bg-black/60 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center"
                onClick={() => navigateFiles('next')}
                aria-label="Next file"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Footer / metadata */}
            <div
              className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm bg-black/80 sm:bg-background text-white/80 sm:text-foreground border-t border-white/10 sm:border-border shrink-0"
              style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
            >
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span><span className="font-medium">Type:</span> {selectedFile && getFileTypeLabel(selectedFile.fileType)}</span>
                <span><span className="font-medium">Size:</span> {selectedFile && formatFileSize(selectedFile.metadata?.size || 0)}</span>
                <span className="hidden sm:inline"><span className="font-medium">Modified:</span> {selectedFile && new Date(parseInt(selectedFile.lastModified)).toLocaleDateString()}</span>
              </div>
              {selectedFile?.description && (
                <p className="mt-1 truncate"><span className="font-medium">Description:</span> {selectedFile.description}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileGrid;

// Define FileVideo component since it's used in the code
const FileVideo = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="m10 11 5 3-5 3v-6Z" />
    </svg>
  );
};
