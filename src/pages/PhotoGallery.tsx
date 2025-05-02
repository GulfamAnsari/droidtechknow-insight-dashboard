
import { useState } from 'react';
import { useDashboard } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import UploadArea from "@/components/gallery/UploadArea";
import PhotoGrid from "@/components/gallery/PhotoGrid";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Photo {
  id: string;
  url: string;
  filename: string;
  upload_date: string;
}

interface PhotosByDate {
  [date: string]: Photo[];
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
      upload_date: photo.upload_date || new Date().toISOString().split('T')[0]
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

const PhotoGallery = () => {
  const { refreshData, isRefreshing } = useDashboard();
  const [activeTab, setActiveTab] = useState("all");
  
  const { data: photos, isLoading, error, refetch } = useQuery({
    queryKey: ["photos"],
    queryFn: fetchPhotos,
  });

  const handleRefresh = () => {
    refreshData();
    refetch();
    toast.success("Gallery refreshed");
  };
  
  const handleUploadSuccess = () => {
    refetch();
    toast.success("Photos uploaded successfully!");
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
  const dates = Object.keys(photosByDate).sort().reverse(); // Most recent first
  
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Photo Gallery</h1>
      </div>
      
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <div className="border-b px-6 py-3">
              <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
                <TabsTrigger value="all">All Photos</TabsTrigger>
                <TabsTrigger value="upload">Upload Photos</TabsTrigger>
                {dates.slice(0, 3).map((date) => (
                  <TabsTrigger key={date} value={date}>
                    {new Date(date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </TabsTrigger>
                ))}
                {dates.length > 3 && (
                  <TabsTrigger value="more">More...</TabsTrigger>
                )}
              </TabsList>
            </div>
            
            <TabsContent value="all" className="p-4 focus-visible:outline-none focus-visible:ring-0">
              {dates.map((date) => (
                <div key={date} className="mb-8">
                  <h3 className="text-lg font-semibold sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                    {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>
                  <PhotoGrid photos={photosByDate[date]} />
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="upload" className="focus-visible:outline-none focus-visible:ring-0">
              <UploadArea onUploadSuccess={handleUploadSuccess} />
            </TabsContent>
            
            {dates.map((date) => (
              <TabsContent key={date} value={date} className="p-4 focus-visible:outline-none focus-visible:ring-0">
                <PhotoGrid photos={photosByDate[date]} />
              </TabsContent>
            ))}
            
            <TabsContent value="more" className="p-4 focus-visible:outline-none focus-visible:ring-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dates.slice(3).map((date) => (
                  <Card key={date} 
                    className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setActiveTab(date)}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-medium">
                        {new Date(date).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {photosByDate[date].length} photos
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhotoGallery;
