
import { useState, useEffect } from 'react';
import { useDashboard } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import UploadArea from "@/components/gallery/UploadArea";
import PhotoGrid from "@/components/gallery/PhotoGrid";
import { Loader2, Search, Grid3X3, LayoutGrid, FolderPlus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Photo {
  id: string;
  url: string;
  filename: string;
  upload_date: string;
  faces?: string[];
  album?: string;
}

interface Category {
  id: string;
  name: string;
  count: number;
  type: 'folder' | 'album' | 'tag';
  icon?: React.ReactNode;
}

// Group photos by date
const groupPhotosByDate = (photos: Photo[]) => {
  return photos.reduce((groups: { [date: string]: Photo[] }, photo) => {
    const date = new Date(photo.upload_date).toISOString().split('T')[0];
    
    if (!groups[date]) {
      groups[date] = [];
    }
    
    groups[date].push(photo);
    return groups;
  }, {});
};

// Get localStorage key for photos
const LOCAL_STORAGE_KEY = 'photo-gallery-data';

const PhotoGallery = () => {
  const { refreshData, isRefreshing } = useDashboard();
  const [searchQuery, setSearchQuery] = useState("");
  const [localPhotos, setLocalPhotos] = useState<Photo[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
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
    queryFn: async () => {
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
    }
  });

  // Combine API photos with local modifications
  const allPhotos = apiPhotos ? apiPhotos.map(apiPhoto => {
    const localPhoto = localPhotos.find(local => local.id === apiPhoto.id);
    return localPhoto ? { ...apiPhoto, ...localPhoto } : apiPhoto;
  }) : [];

  // Filter photos by search query
  const filteredPhotos = allPhotos.filter(photo => 
    photo.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (photo.album && photo.album.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (photo.faces && photo.faces.some(face => face.toLowerCase().includes(searchQuery.toLowerCase())))
  );
  
  const handleRefresh = () => {
    refreshData();
    refetch();
    toast.success("Gallery refreshed");
  };
  
  const handleUploadSuccess = () => {
    refetch();
    toast.success("Photos uploaded successfully!");
    setIsUploadOpen(false);
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

  // Create categories based on the data
  const categories: Category[] = [
    { id: 'all', name: 'All Images', count: filteredPhotos.length, type: 'folder', icon: <LayoutGrid className="h-4 w-4 mr-2" /> },
    { id: 'recent', name: 'Recent', count: filteredPhotos.filter(p => {
      const uploadDate = new Date(p.upload_date);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return uploadDate > oneWeekAgo;
    }).length, type: 'folder' },
    ...Array.from(new Set(filteredPhotos.filter(p => p.album).map(p => p.album as string)))
      .map(album => ({ 
        id: `album-${album}`, 
        name: album, 
        count: filteredPhotos.filter(p => p.album === album).length,
        type: 'album' as const
      })),
    ...Array.from(new Set(filteredPhotos.flatMap(p => p.faces || [])))
      .map(face => ({ 
        id: `face-${face}`, 
        name: face, 
        count: filteredPhotos.filter(p => p.faces?.includes(face)).length,
        type: 'tag' as const
      }))
  ];
  
  // Get photos for the selected category
  let displayPhotos = filteredPhotos;
  if (selectedCategory) {
    if (selectedCategory === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      displayPhotos = filteredPhotos.filter(p => new Date(p.upload_date) > oneWeekAgo);
    } else if (selectedCategory.startsWith('album-')) {
      const albumName = selectedCategory.replace('album-', '');
      displayPhotos = filteredPhotos.filter(p => p.album === albumName);
    } else if (selectedCategory.startsWith('face-')) {
      const faceName = selectedCategory.replace('face-', '');
      displayPhotos = filteredPhotos.filter(p => p.faces?.includes(faceName));
    }
  }

  // Group by date for display
  const photosByDate = groupPhotosByDate(displayPhotos);
  const dates = Object.keys(photosByDate).sort().reverse(); // Most recent first
  
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
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-muted/30 border-r flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Assets</h2>
          <p className="text-xs text-muted-foreground">Upload and manage images</p>
        </div>
        
        <div className="flex-1 overflow-auto">
          <div className="pt-4 px-2">
            <div className="mb-4">
              <div className="flex items-center px-3 mb-2">
                <h3 className="font-medium text-sm">Categories</h3>
              </div>
              <ul className="space-y-1">
                {categories.filter(c => c.type === 'folder').map((category) => (
                  <li key={category.id}>
                    <button
                      onClick={() => setSelectedCategory(category.id === 'all' ? null : category.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-md flex items-center justify-between text-sm ${
                        (category.id === 'all' && !selectedCategory) || selectedCategory === category.id 
                          ? 'bg-accent text-accent-foreground' 
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-center">
                        {category.icon || <LayoutGrid className="h-4 w-4 mr-2" />}
                        {category.name}
                      </div>
                      <Badge variant="gray">{category.count}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between px-3 mb-2">
                <h3 className="font-medium text-sm">Albums</h3>
                <button className="text-xs text-primary hover:underline">
                  <FolderPlus className="h-3 w-3" />
                </button>
              </div>
              <ul className="space-y-1">
                {categories.filter(c => c.type === 'album').length ? (
                  categories.filter(c => c.type === 'album').map((category) => (
                    <li key={category.id}>
                      <button
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full text-left px-3 py-1.5 rounded-md flex items-center justify-between text-sm ${
                          selectedCategory === category.id 
                            ? 'bg-accent text-accent-foreground' 
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        <span>{category.name}</span>
                        <Badge variant="gray">{category.count}</Badge>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-xs text-muted-foreground">No albums yet</li>
                )}
              </ul>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center px-3 mb-2">
                <h3 className="font-medium text-sm">People</h3>
              </div>
              <ul className="space-y-1">
                {categories.filter(c => c.type === 'tag').length ? (
                  categories.filter(c => c.type === 'tag').map((category) => (
                    <li key={category.id}>
                      <button
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full text-left px-3 py-1.5 rounded-md flex items-center justify-between text-sm ${
                          selectedCategory === category.id 
                            ? 'bg-accent text-accent-foreground' 
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        <span>{category.name}</span>
                        <Badge variant="gray">{category.count}</Badge>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-xs text-muted-foreground">No people tagged yet</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1">
            <div className="relative w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search images..." 
                className="pl-8" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-1 border rounded-md p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-accent' : 'hover:bg-muted'}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-accent' : 'hover:bg-muted'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="ml-auto">
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <UploadArea onUploadSuccess={handleUploadSuccess} />
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-auto p-6">
          {displayPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-muted-foreground mb-4">No images found</p>
              <Button onClick={() => setIsUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload your first image
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            // Grid view - organized by date
            <div className="space-y-8">
              {dates.map((date) => (
                <div key={date} className="space-y-3">
                  <h3 className="font-medium">
                    {new Date(date).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {photosByDate[date].map((photo) => (
                      <Card key={photo.id} className="overflow-hidden group">
                        <div className="aspect-square bg-muted relative overflow-hidden">
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
                        </div>
                        <div className="p-2 truncate text-xs">
                          {photo.filename}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // List view
            <div className="space-y-2">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-sm p-2">Name</th>
                    <th className="text-left font-medium text-sm p-2">Date</th>
                    <th className="text-left font-medium text-sm p-2">Album</th>
                    <th className="text-left font-medium text-sm p-2">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPhotos.map((photo) => (
                    <tr key={photo.id} className="hover:bg-muted/50">
                      <td className="p-2">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-muted rounded overflow-hidden">
                            <img 
                              src={photo.url} 
                              alt={photo.filename}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <span className="text-sm">{photo.filename}</span>
                        </div>
                      </td>
                      <td className="p-2 text-sm">
                        {new Date(photo.upload_date).toLocaleDateString()}
                      </td>
                      <td className="p-2 text-sm">
                        {photo.album ? (
                          <Badge variant="blue">{photo.album}</Badge>
                        ) : "-"}
                      </td>
                      <td className="p-2">
                        {photo.faces && photo.faces.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {photo.faces.map((face, i) => (
                              <Badge key={i} variant="gray">{face}</Badge>
                            ))}
                          </div>
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoGallery;
