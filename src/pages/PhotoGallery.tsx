
import { useState, useEffect } from 'react';
import { useDashboard } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import UploadArea from "@/components/gallery/UploadArea";
import PhotoGrid from "@/components/gallery/PhotoGrid";
import { Loader2, User, LibrarySquare, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Photo {
  id: string;
  url: string;
  filename: string;
  upload_date: string;
  faces?: string[];
  album?: string;
}

interface PhotosByDate {
  [date: string]: Photo[];
}

interface PhotosByAlbum {
  [album: string]: Photo[];
}

interface PhotosByFace {
  [face: string]: Photo[];
}

const fetchPhotos = async (): Promise<Photo[]> => {
  try {
    const response = await fetch("https://droidtechknow.com/admin/get_images.php");
    if (!response.ok) {
      throw new Error("Failed to fetch images");
    }
    const data = await response.json();
    
    // Transform the data to our Photo interface
    return data.map((photo: any) => ({
      id: photo.id || String(Math.random()),
      url: photo.url || photo.path, // Handle different response formats
      filename: photo.filename || photo.name || 'Unnamed',
      upload_date: photo.upload_date || new Date().toISOString().split('T')[0],
      faces: photo.faces || [],
      album: photo.album || null
    }));
  } catch (error) {
    console.error("Error fetching photos:", error);
    throw error;
  }
};

// Group photos by date
const groupPhotosByDate = (photos: Photo[]): PhotosByDate => {
  return photos.reduce((groups: PhotosByDate, photo) => {
    // Format date as YYYY-MM-DD
    const date = new Date(photo.upload_date).toISOString().split('T')[0];
    
    if (!groups[date]) {
      groups[date] = [];
    }
    
    groups[date].push(photo);
    return groups;
  }, {});
};

// Group photos by album
const groupPhotosByAlbum = (photos: Photo[]): PhotosByAlbum => {
  return photos.reduce((groups: PhotosByAlbum, photo) => {
    if (photo.album) {
      if (!groups[photo.album]) {
        groups[photo.album] = [];
      }
      groups[photo.album].push(photo);
    }
    return groups;
  }, {});
};

// Group photos by face
const groupPhotosByFace = (photos: Photo[]): PhotosByFace => {
  const faceGroups: PhotosByFace = {};
  
  photos.forEach(photo => {
    if (photo.faces && photo.faces.length > 0) {
      photo.faces.forEach(face => {
        if (!faceGroups[face]) {
          faceGroups[face] = [];
        }
        faceGroups[face].push(photo);
      });
    }
  });
  
  return faceGroups;
};

// Get localStorage key for photos
const LOCAL_STORAGE_KEY = 'photo-gallery-data';

const PhotoGallery = () => {
  const { refreshData, isRefreshing } = useDashboard();
  const [activeTab, setActiveTab] = useState("all");
  const [localPhotos, setLocalPhotos] = useState<Photo[]>([]);
  
  // Load initial data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setLocalPhotos(parsedData);
      } catch (error) {
        console.error("Error parsing local storage data:", error);
      }
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (localPhotos.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localPhotos));
    }
  }, [localPhotos]);
  
  const { data: apiPhotos, isLoading, error, refetch } = useQuery({
    queryKey: ["photos"],
    queryFn: fetchPhotos,
  });

  // Combine API photos with local modifications
  const photos = apiPhotos ? apiPhotos.map(apiPhoto => {
    const localPhoto = localPhotos.find(local => local.id === apiPhoto.id);
    return localPhoto ? { ...apiPhoto, ...localPhoto } : apiPhoto;
  }) : [];

  const handleRefresh = () => {
    refreshData();
    refetch();
    toast.success("Gallery refreshed");
  };
  
  const handleUploadSuccess = () => {
    refetch();
    toast.success("Photos uploaded successfully!");
  };

  const handleAddToAlbum = (photo: Photo, album: string) => {
    const updatedPhoto = { ...photo, album };
    updateLocalPhoto(updatedPhoto);
    toast.success(`Added to album: ${album}`);
  };

  const handleTagFace = (photo: Photo, face: string) => {
    const faces = photo.faces ? [...photo.faces, face] : [face];
    const updatedPhoto = { ...photo, faces };
    updateLocalPhoto(updatedPhoto);
    toast.success(`Tagged face: ${face}`);
  };

  const updateLocalPhoto = (photo: Photo) => {
    setLocalPhotos(current => {
      const exists = current.findIndex(p => p.id === photo.id);
      if (exists >= 0) {
        return current.map(p => p.id === photo.id ? photo : p);
      } else {
        return [...current, photo];
      }
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading photos...</span>
      </div>
    );
  }
  
  if (error) {
    toast.error("Failed to load photos. Please try again.");
    return (
      <div className="text-center p-6">
        <p className="text-destructive mb-2">Failed to load photos</p>
        <button 
          onClick={() => refetch()} 
          className="text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }
  
  const photosByDate = photos ? groupPhotosByDate(photos) : {};
  const photosByAlbum = photos ? groupPhotosByAlbum(photos) : {};
  const photosByFace = photos ? groupPhotosByFace(photos) : {};
  
  const dates = Object.keys(photosByDate).sort().reverse(); // Most recent first
  const albums = Object.keys(photosByAlbum).sort();
  const faces = Object.keys(photosByFace).sort();
  
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Photo Gallery</h1>
      </div>
      
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <div className="border-b px-6 py-3 overflow-x-auto">
              <TabsList className="flex gap-2">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4" />
                  All Photos
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M7 10v12"/><path d="M15 10v12"/><path d="M3 6h18"/><path d="M3 22h18"/><path d="M14 2H8a2 2 0 0 0-2 2v2h12V4a2 2 0 0 0-2-2Z"/></svg>
                  Upload Photos
                </TabsTrigger>
                <TabsTrigger value="albums" className="flex items-center gap-2">
                  <LibrarySquare className="h-4 w-4" />
                  Albums {albums.length > 0 && <Badge variant="secondary" className="ml-1">{albums.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="faces" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  People {faces.length > 0 && <Badge variant="secondary" className="ml-1">{faces.length}</Badge>}
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="p-4 focus-visible:outline-none focus-visible:ring-0">
              {dates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No photos yet</p>
                  <Button onClick={() => setActiveTab("upload")}>Upload photos</Button>
                </div>
              ) : (
                dates.map((date) => (
                  <div key={date} className="mb-8">
                    <h3 className="text-lg font-semibold sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </h3>
                    <PhotoGrid 
                      photos={photosByDate[date]} 
                      onAddToAlbum={handleAddToAlbum}
                      onTagFace={handleTagFace}
                    />
                  </div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="upload" className="focus-visible:outline-none focus-visible:ring-0">
              <UploadArea onUploadSuccess={handleUploadSuccess} />
            </TabsContent>
            
            <TabsContent value="albums" className="p-4 focus-visible:outline-none focus-visible:ring-0">
              {albums.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No albums yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add photos to albums by selecting a photo and clicking "Add to Album"
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {albums.map((album) => (
                    <Card key={album} className="overflow-hidden">
                      <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                        {photosByAlbum[album][0] && (
                          <img 
                            src={photosByAlbum[album][0].url} 
                            alt={album}
                            className="h-full w-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                          <div className="p-4 text-white">
                            <h3 className="font-medium text-lg">{album}</h3>
                            <p className="text-sm opacity-80">{photosByAlbum[album].length} photos</p>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <PhotoGrid 
                          photos={photosByAlbum[album]} 
                          onAddToAlbum={handleAddToAlbum}
                          onTagFace={handleTagFace}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="faces" className="p-4 focus-visible:outline-none focus-visible:ring-0">
              {faces.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No tagged people yet</p>
                  <p className="text-sm text-muted-foreground">
                    Tag people in photos by selecting a photo and clicking "Tag Face"
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {faces.map((face) => (
                    <Card key={face} className="overflow-hidden">
                      <div className="aspect-square overflow-hidden bg-muted relative">
                        {photosByFace[face][0] && (
                          <img 
                            src={photosByFace[face][0].url} 
                            alt={face}
                            className="h-full w-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                          <div className="p-4 text-white">
                            <div className="flex items-center gap-2">
                              <User className="h-5 w-5" />
                              <h3 className="font-medium text-lg">{face}</h3>
                            </div>
                            <p className="text-sm opacity-80">{photosByFace[face].length} photos</p>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <PhotoGrid 
                          photos={photosByFace[face]} 
                          onAddToAlbum={handleAddToAlbum}
                          onTagFace={handleTagFace}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhotoGallery;
