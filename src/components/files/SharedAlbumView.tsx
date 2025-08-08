import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, ArrowLeft } from 'lucide-react';
import FileGrid from "./FileGrid";

interface SharedAlbum {
  id: string;
  name: string;
  photos: any[];
  fromUserId?: string;
  toUserId?: string;
}

interface SharedAlbumViewProps {
  albums: SharedAlbum[];
  selectedAlbum: SharedAlbum | null;
  onAlbumSelect: (album: SharedAlbum | null) => void;
  onDeleteFile?: (fileId: string) => void;
  categoryType: 'shared' | 'shared-by-me';
}

export const SharedAlbumView: React.FC<SharedAlbumViewProps> = ({
  albums,
  selectedAlbum,
  onAlbumSelect,
  onDeleteFile,
  categoryType
}) => {
  // If an album is selected, show its contents
  if (selectedAlbum) {
    return (
      <div>
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAlbumSelect(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Albums
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{selectedAlbum.name}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedAlbum.photos.length} photos
              {categoryType === 'shared' && selectedAlbum.fromUserId && 
                ` • Shared by User ${selectedAlbum.fromUserId}`
              }
              {categoryType === 'shared-by-me' && selectedAlbum.toUserId && 
                ` • Shared with User ${selectedAlbum.toUserId}`
              }
            </p>
          </div>
        </div>
        
        {/* Display album photos */}
        <FileGrid 
          files={selectedAlbum.photos}
          onDeleteFile={onDeleteFile}
          gridSize={150}
        />
      </div>
    );
  }

  // Show album list
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          {categoryType === 'shared' ? 'Albums Shared With Me' : 'Albums I\'ve Shared'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {albums.length} album{albums.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {albums.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Albums</h3>
          <p className="text-muted-foreground">
            {categoryType === 'shared' 
              ? 'No albums have been shared with you yet.' 
              : 'You haven\'t shared any albums yet.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {albums.map((album) => (
            <Card 
              key={album.id} 
              className="hover:shadow-md cursor-pointer transition-shadow"
              onClick={() => onAlbumSelect(album)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FolderOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{album.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {album.photos.length} photo{album.photos.length !== 1 ? 's' : ''}
                    </p>
                    {categoryType === 'shared' && album.fromUserId && (
                      <p className="text-xs text-muted-foreground">
                        From User {album.fromUserId}
                      </p>
                    )}
                    {categoryType === 'shared-by-me' && album.toUserId && (
                      <p className="text-xs text-muted-foreground">
                        Shared with User {album.toUserId}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SharedAlbumView;