
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User, Tag, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Photo {
  id: string;
  url: string;
  filename: string;
  upload_date: string;
  faces?: string[];
  album?: string;
}

interface PhotoGridProps {
  photos: Photo[];
  onAddToAlbum?: (photo: Photo, album: string) => void;
  onTagFace?: (photo: Photo, face: string) => void;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ photos, onAddToAlbum, onTagFace }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [faceInput, setFaceInput] = useState("");
  const [albumInput, setAlbumInput] = useState("");

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No photos found for this date.
      </div>
    );
  }

  const handleAddToAlbum = () => {
    if (selectedPhoto && albumInput && onAddToAlbum) {
      onAddToAlbum(selectedPhoto, albumInput);
      setAlbumInput("");
    }
  };

  const handleTagFace = () => {
    if (selectedPhoto && faceInput && onTagFace) {
      onTagFace(selectedPhoto, faceInput);
      setFaceInput("");
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {photos.map((photo) => (
          <Card 
            key={photo.id}
            className="overflow-hidden cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] group"
            onClick={() => {
              setSelectedPhoto(photo);
              setShowOptions(false);
            }}
          >
            <div className="aspect-square overflow-hidden bg-muted relative">
              <img 
                src={photo.url} 
                alt={photo.filename}
                className="h-full w-full object-cover transition-all group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = 'https://placehold.co/600x400?text=Error';
                }}
              />
              {photo.album && (
                <Badge variant="blue" className="absolute bottom-2 left-2 bg-background/70">
                  <Tag className="mr-1 h-3 w-3" /> {photo.album}
                </Badge>
              )}
              {photo.faces && photo.faces.length > 0 && (
                <Badge variant="gray" className="absolute bottom-2 right-2 bg-background/70">
                  <User className="mr-1 h-3 w-3" /> {photo.faces.length}
                </Badge>
              )}
            </div>
            <div className="p-2 text-xs truncate">
              {photo.filename}
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
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="font-medium">{selectedPhoto.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedPhoto.upload_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOptions(!showOptions);
                    }}
                  >
                    <Info className="h-4 w-4 mr-2" />
                    {showOptions ? 'Hide Details' : 'Show Details'}
                  </Button>
                </div>
                
                {showOptions && (
                  <div className="mt-4 space-y-4 pt-4 border-t">
                    {/* Album section */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label htmlFor="album" className="text-sm font-medium mb-1 block">
                          Add to Album
                        </label>
                        <div className="flex gap-2">
                          <Input 
                            id="album" 
                            value={albumInput} 
                            onChange={(e) => setAlbumInput(e.target.value)}
                            placeholder="Album name"
                          />
                          <Button 
                            size="sm" 
                            onClick={handleAddToAlbum}
                            disabled={!albumInput}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Faces section */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label htmlFor="face" className="text-sm font-medium mb-1 block">
                          Tag Person
                        </label>
                        <div className="flex gap-2">
                          <Input 
                            id="face" 
                            value={faceInput} 
                            onChange={(e) => setFaceInput(e.target.value)}
                            placeholder="Person's name"
                          />
                          <Button 
                            size="sm" 
                            onClick={handleTagFace}
                            disabled={!faceInput}
                          >
                            Tag
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Display tagged faces */}
                    {selectedPhoto.faces && selectedPhoto.faces.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Tagged People:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedPhoto.faces.map((face, index) => (
                            <Badge key={index} variant="gray">
                              <User className="mr-1 h-3 w-3" /> {face}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoGrid;
