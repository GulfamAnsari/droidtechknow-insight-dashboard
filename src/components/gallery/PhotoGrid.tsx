
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Download, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import LazyImage from "@/components/ui/lazy-image";

interface Photo {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadDate: Date;
  thumbnail?: string;
}

interface PhotoGridProps {
  photos: Photo[];
  onDelete: (id: string) => void;
  onDownload: (photo: Photo) => void;
  className?: string;
}

const PhotoGrid = ({ photos, onDelete, onDownload, className }: PhotoGridProps) => {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No photos uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", className)}>
        {photos.map((photo) => (
          <Card key={photo.id} className="group hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="aspect-square relative">
                <LazyImage
                  src={photo.thumbnail || photo.url}
                  alt={photo.name}
                  className="w-full h-full"
                  placeholder="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmM2Y0ZjYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNlNWU3ZWIiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg=="
                />
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onDownload(photo)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(photo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-3">
                <p className="text-sm font-medium truncate">{photo.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(photo.size)} • {photo.uploadDate.toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Photo viewer modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-4xl max-h-full relative">
            <LazyImage
              src={selectedPhoto.url}
              alt={selectedPhoto.name}
              className="max-w-full max-h-full object-contain"
            />
            <Button
              className="absolute top-4 right-4"
              variant="secondary"
              size="sm"
              onClick={() => setSelectedPhoto(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoGrid;
