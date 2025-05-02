
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User, Tag } from "lucide-react";

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
        {photos.map((photo) => (
          <Card 
            key={photo.id}
            className="overflow-hidden cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] relative group"
            onClick={() => {
              setSelectedPhoto(photo);
              setShowOptions(false);
            }}
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
              {photo.album && (
                <Badge variant="secondary" className="absolute bottom-2 left-2 bg-background/70">
                  <Tag className="mr-1 h-3 w-3" /> {photo.album}
                </Badge>
              )}
              {photo.faces && photo.faces.length > 0 && (
                <Badge variant="outline" className="absolute bottom-2 right-2 bg-background/70">
                  <User className="mr-1 h-3 w-3" /> {photo.faces.length}
                </Badge>
              )}
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
                    Options
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
                          Tag Face
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
                            <Badge key={index} variant="secondary">
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

// Missing components that need to be imported
interface ButtonProps {
  variant?: string;
  size?: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant, size, onClick, disabled, children }) => (
  <button 
    className={`inline-flex items-center justify-center rounded-md font-medium ${
      variant === 'outline' ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'
    } ${
      size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 py-2 text-sm'
    }`}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

const Input: React.FC<{
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}> = ({ id, value, onChange, placeholder }) => (
  <input
    id={id}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
  />
);
