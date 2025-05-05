
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, User, Tag, X, ChevronLeft, ChevronRight } from "lucide-react";
import { getFileIcon, getFileType, getFileTypeLabel } from "./FileUtils";

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
}

interface FileGridProps {
  files: FileItem[];
  onViewFile?: (file: FileItem) => void;
}

const FileGrid: React.FC<FileGridProps> = ({ files, onViewFile }) => {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  
  if (!files || files.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No files found.
      </div>
    );
  }

  const handleFileClick = (file: FileItem) => {
    setSelectedFile(file);
    if (onViewFile) {
      onViewFile(file);
    }
  };
  
  const navigateFiles = (direction: 'next' | 'prev') => {
    if (!selectedFile) return;
    
    const currentIndex = files.findIndex(f => f.id === selectedFile.id);
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = currentIndex === files.length - 1 ? 0 : currentIndex + 1;
    } else {
      newIndex = currentIndex === 0 ? files.length - 1 : currentIndex - 1;
    }
    
    setSelectedFile(files[newIndex]);
  };
  
  const renderFilePreview = (file: FileItem) => {
    const fileType = file.fileType || getFileType(file.title, file.metadata?.format || '');
    
    if (fileType === 'photo') {
      return (
        <img 
          src={file.url.startsWith('http') ? file.url : `https://droidtechknow.com/admin/${file.url}`} 
          alt={file.title}
          className="max-h-full max-w-full object-contain"
        />
      );
    } else if (fileType === 'video') {
      return (
        <video 
          src={file.url.startsWith('http') ? file.url : `https://droidtechknow.com/admin/${file.url}`}
          controls
          className="max-h-full max-w-full"
        >
          Your browser does not support the video tag.
        </video>
      );
    } else {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="h-32 w-32 flex items-center justify-center mb-4">
            {getFileIcon(file.fileType, file.metadata?.format || '')}
          </div>
          <p className="text-lg text-center">{file.title}</p>
          <Button className="mt-4" asChild>
            <a href={file.url.startsWith('http') ? file.url : `https://droidtechknow.com/admin/${file.url}`} download={file.title} target="_blank" rel="noopener noreferrer">
              Download File
            </a>
          </Button>
        </div>
      );
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {files.map((file) => (
          <Card 
            key={file.id}
            className="overflow-hidden cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] group"
            onClick={() => handleFileClick(file)}
          >
            <div className="aspect-square overflow-hidden bg-muted relative">
              {file.fileType === 'photo' ? (
                <img 
                  src={file.url.startsWith('http') ? file.url : `https://droidtechknow.com/admin/${file.url}`} 
                  alt={file.title}
                  className="h-full w-full object-cover transition-all group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://placehold.co/600x400?text=Error';
                  }}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  {getFileIcon(file.fileType, file.metadata?.format || '')}
                </div>
              )}
              {file.album && (
                <Badge variant="blue" className="absolute bottom-2 left-2 bg-background/70">
                  <Tag className="mr-1 h-3 w-3" /> {file.album}
                </Badge>
              )}
            </div>
            <div className="p-2 text-xs truncate">
              {file.title}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <DialogContent className="max-w-7xl w-full h-[90vh] p-0 overflow-hidden">
          {selectedFile && (
            <div className="relative h-full w-full flex flex-col">
              <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
                {renderFilePreview(selectedFile)}
                
                {/* Navigation buttons */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateFiles('prev');
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateFiles('next');
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
                
                {/* Close button */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                {/* Info button */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-16 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="p-4 bg-background border-t">
                <h2 className="font-medium text-lg">{selectedFile.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {getFileTypeLabel(selectedFile.fileType)} • 
                  {selectedFile.metadata?.size ? ` ${(selectedFile.metadata.size / 1024 / 1024).toFixed(2)} MB • ` : ' '}
                  Uploaded on {new Date(selectedFile.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileGrid;
