
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Photo {
  id: string;
  url: string;
  filename: string;
  upload_date: string;
}

interface PhotoGridProps {
  photos: Photo[];
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ photos }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No photos found for this date.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
        {photos.map((photo) => (
          <Card 
            key={photo.id}
            className="overflow-hidden cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
            onClick={() => setSelectedPhoto(photo)}
          >
            <div className="aspect-square overflow-hidden bg-muted">
              <img 
                src={photo.url} 
                alt={photo.filename}
                className="h-full w-full object-cover transition-all hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = 'https://placehold.co/600x400?text=Image+Error';
                }}
              />
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] p-0 overflow-hidden">
          {selectedPhoto && (
            <div className="relative h-full">
              <img 
                src={selectedPhoto.url}
                alt={selectedPhoto.filename}
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-4">
                <p className="font-medium">{selectedPhoto.filename}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedPhoto.upload_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoGrid;
