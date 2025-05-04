
import React, { useState, useEffect } from 'react';
import { useDashboard } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import UploadArea from "@/components/gallery/UploadArea";
import { 
  Loader2, Search, Grid3X3, LayoutGrid, FolderPlus, Upload, 
  X, ChevronLeft, ChevronRight, Info, FileText, FileImage, 
  FileVideo, FileAudio, File 
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FileItem {
  id: string;
  url: string;
  filename: string;
  upload_date: string;
  type: string;
  size: number;
  faces?: string[];
  album?: string;
  metadata?: Record<string, any>;
}

interface Category {
  id: string;
  name: string;
  count: number;
  type: 'folder' | 'album' | 'tag';
  icon?: React.ReactNode;
}

// Group files by date
const groupFilesByDate = (files: FileItem[]) => {
  return files.reduce((groups: { [date: string]: FileItem[] }, file) => {
    const date = new Date(file.upload_date).toISOString().split('T')[0];
    
    if (!groups[date]) {
      groups[date] = [];
    }
    
    groups[date].push(file);
    return groups;
  }, {});
};

// Get localStorage key for files
const LOCAL_STORAGE_KEY = 'file-gallery-data';

const FileGallery = () => {
  const { refreshData, isRefreshing } = useDashboard();
  const [searchQuery, setSearchQuery] = useState("");
  const [localFiles, setLocalFiles] = useState<FileItem[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeFile, setActiveFile] = useState<FileItem | null>(null);
  const [showFileInfo, setShowFileInfo] = useState(false);
  
  // Load initial data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setLocalFiles(parsedData);
      } catch (error) {
        console.error("Error parsing local storage data:", error);
      }
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (localFiles.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localFiles));
    }
  }, [localFiles]);
  
  const { data: apiFiles, isLoading, error, refetch } = useQuery({
    queryKey: ["files"],
    queryFn: async () => {
      try {
        const response = await fetch("https://droidtechknow.com/admin/get_images.php");
        if (!response.ok) {
          throw new Error("Failed to fetch files");
        }
        const data = await response.json();
        
        // Transform the data to our FileItem interface
        return data.map((file: any) => ({
          id: file.id || String(Math.random()),
          url: file.url || file.path, // Handle different response formats
          filename: file.filename || file.name || 'Unnamed',
          type: file.type || (file.url?.includes('.jpg') ? 'image/jpeg' : 'application/octet-stream'),
          size: file.size || 0,
          upload_date: file.upload_date || new Date().toISOString().split('T')[0],
          faces: file.faces || [],
          album: file.album || null,
          metadata: file.metadata || {}
        }));
      } catch (error) {
        console.error("Error fetching files:", error);
        throw error;
      }
    }
  });

  // Combine API files with local modifications
  const allFiles = apiFiles ? apiFiles.map(apiFile => {
    const localFile = localFiles.find(local => local.id === apiFile.id);
    return localFile ? { ...apiFile, ...localFile } : apiFile;
  }) : [];

  // Filter files by search query
  const filteredFiles = allFiles.filter(file => 
    file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (file.album && file.album.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (file.faces && file.faces.some(face => face.toLowerCase().includes(searchQuery.toLowerCase())))
  );
  
  const handleRefresh = () => {
    refreshData();
    refetch();
    toast.success("Gallery refreshed");
  };
  
  const handleUploadSuccess = () => {
    refetch();
    toast.success("Files uploaded successfully!");
    setIsUploadOpen(false);
  };

  const handleAddToAlbum = (file: FileItem, album: string) => {
    const updatedFile = { ...file, album };
    updateLocalFile(updatedFile);
    toast.success(`Added to album: ${album}`);
  };

  const handleTagFace = (file: FileItem, face: string) => {
    const faces = file.faces ? [...file.faces, face] : [face];
    const updatedFile = { ...file, faces };
    updateLocalFile(updatedFile);
    toast.success(`Tagged face: ${face}`);
  };

  const updateLocalFile = (file: FileItem) => {
    setLocalFiles(current => {
      const exists = current.findIndex(p => p.id === file.id);
      if (exists >= 0) {
        return current.map(p => p.id === file.id ? file : p);
      } else {
        return [...current, file];
      }
    });
  };

  // Create categories based on the data
  const categories: Category[] = [
    { id: 'all', name: 'All Files', count: filteredFiles.length, type: 'folder', icon: <LayoutGrid className="h-4 w-4 mr-2" /> },
    { id: 'recent', name: 'Recent', count: filteredFiles.filter(p => {
      const uploadDate = new Date(p.upload_date);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return uploadDate > oneWeekAgo;
    }).length, type: 'folder' },
    { id: 'images', name: 'Images', count: filteredFiles.filter(f => f.type?.startsWith('image/')).length, type: 'folder', icon: <FileImage className="h-4 w-4 mr-2" /> },
    { id: 'documents', name: 'Documents', count: filteredFiles.filter(f => 
      f.type?.includes('pdf') || 
      f.type?.includes('doc') || 
      f.type?.includes('txt') || 
      f.type?.includes('sheet')
    ).length, type: 'folder', icon: <FileText className="h-4 w-4 mr-2" /> },
    { id: 'videos', name: 'Videos', count: filteredFiles.filter(f => f.type?.startsWith('video/')).length, type: 'folder', icon: <FileVideo className="h-4 w-4 mr-2" /> },
    { id: 'audio', name: 'Audio', count: filteredFiles.filter(f => f.type?.startsWith('audio/')).length, type: 'folder', icon: <FileAudio className="h-4 w-4 mr-2" /> },
    ...Array.from(new Set(filteredFiles.filter(p => p.album).map(p => p.album as string)))
      .map(album => ({ 
        id: `album-${album}`, 
        name: album as string,
        count: filteredFiles.filter(p => p.album === album).length,
        type: 'album' as const
      }))
  ];
  
  // Get files for the selected category
  let displayFiles = filteredFiles;
  if (selectedCategory) {
    if (selectedCategory === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      displayFiles = filteredFiles.filter(p => new Date(p.upload_date) > oneWeekAgo);
    } else if (selectedCategory === 'images') {
      displayFiles = filteredFiles.filter(f => f.type?.startsWith('image/'));
    } else if (selectedCategory === 'documents') {
      displayFiles = filteredFiles.filter(f => 
        f.type?.includes('pdf') || 
        f.type?.includes('doc') || 
        f.type?.includes('txt') || 
        f.type?.includes('sheet')
      );
    } else if (selectedCategory === 'videos') {
      displayFiles = filteredFiles.filter(f => f.type?.startsWith('video/'));
    } else if (selectedCategory === 'audio') {
      displayFiles = filteredFiles.filter(f => f.type?.startsWith('audio/'));
    } else if (selectedCategory.startsWith('album-')) {
      const albumName = selectedCategory.replace('album-', '');
      displayFiles = filteredFiles.filter(p => p.album === albumName);
    }
  }

  // Group by date for display
  const filesByDate = groupFilesByDate(displayFiles);
  const dates = Object.keys(filesByDate).sort().reverse(); // Most recent first
  
  // Fullscreen modal navigation
  const handleFileClick = (file: FileItem) => {
    setActiveFile(file);
  };
  
  const navigateFiles = (direction: 'next' | 'prev') => {
    if (!activeFile) return;
    
    const currentIndex = displayFiles.findIndex(p => p.id === activeFile.id);
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = currentIndex === displayFiles.length - 1 ? 0 : currentIndex + 1;
    } else {
      newIndex = currentIndex === 0 ? displayFiles.length - 1 : currentIndex - 1;
    }
    
    setActiveFile(displayFiles[newIndex]);
  };

  const getFileIcon = (file: FileItem) => {
    const type = file.type || '';
    
    if (type.startsWith('image/')) {
      return <FileImage className="h-10 w-10 text-green-500" />;
    } else if (type.startsWith('video/')) {
      return <FileVideo className="h-10 w-10 text-red-500" />;
    } else if (type.startsWith('audio/')) {
      return <FileAudio className="h-10 w-10 text-purple-500" />;
    } else if (type.includes('pdf')) {
      return <FileText className="h-10 w-10 text-red-600" />;
    } else if (type.includes('doc')) {
      return <FileText className="h-10 w-10 text-blue-600" />;
    } else {
      return <File className="h-10 w-10 text-gray-600" />;
    }
  };
  
  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading files...</span>
      </div>
    );
  }
  
  if (error) {
    toast.error("Failed to load files. Please try again.");
    return (
      <div className="text-center p-6">
        <p className="text-destructive mb-2">Failed to load files</p>
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
          <h2 className="font-semibold text-lg">My Files</h2>
          <p className="text-xs text-muted-foreground">Upload and manage your files</p>
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
                placeholder="Search files..." 
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
          {displayFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-muted-foreground mb-4">No files found</p>
              <Button onClick={() => setIsUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload your first file
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
                    {filesByDate[date].map((file) => (
                      <Card key={file.id} className="overflow-hidden group cursor-pointer" onClick={() => handleFileClick(file)}>
                        <div className="aspect-square bg-muted relative overflow-hidden">
                          {file.type?.startsWith('image/') ? (
                            <img 
                              src={file.url} 
                              alt={file.filename}
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
                              {getFileIcon(file)}
                            </div>
                          )}
                        </div>
                        <div className="p-2 truncate text-xs">
                          {file.filename}
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
                    <th className="text-left font-medium text-sm p-2">Type</th>
                    <th className="text-left font-medium text-sm p-2">Size</th>
                    <th className="text-left font-medium text-sm p-2">Date</th>
                    <th className="text-left font-medium text-sm p-2">Album</th>
                  </tr>
                </thead>
                <tbody>
                  {displayFiles.map((file) => (
                    <tr 
                      key={file.id} 
                      className="hover:bg-muted/50 cursor-pointer" 
                      onClick={() => handleFileClick(file)}
                    >
                      <td className="p-2">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 flex items-center justify-center">
                            {file.type?.startsWith('image/') ? (
                              <img 
                                src={file.url} 
                                alt={file.filename}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getFileIcon(file)
                            )}
                          </div>
                          <span className="text-sm">{file.filename}</span>
                        </div>
                      </td>
                      <td className="p-2 text-sm uppercase">
                        {file.type?.split('/')[1] || 'Unknown'}
                      </td>
                      <td className="p-2 text-sm">
                        {formatBytes(file.size)}
                      </td>
                      <td className="p-2 text-sm">
                        {new Date(file.upload_date).toLocaleDateString()}
                      </td>
                      <td className="p-2 text-sm">
                        {file.album ? (
                          <Badge variant="blue">{file.album}</Badge>
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

      {/* Fullscreen file modal */}
      <Dialog open={!!activeFile} onOpenChange={(open) => !open && setActiveFile(null)}>
        <DialogContent className="max-w-7xl w-full h-[90vh] p-0 overflow-hidden">
          <div className="relative h-full w-full flex flex-col">
            {/* File view area */}
            <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
              {activeFile && activeFile.type?.startsWith('image/') && (
                <img
                  src={activeFile.url}
                  alt={activeFile.filename}
                  className="max-h-full max-w-full object-contain"
                />
              )}
              
              {activeFile && !activeFile.type?.startsWith('image/') && (
                <div className="text-center text-white p-8">
                  <div className="mb-4 flex justify-center">
                    {getFileIcon(activeFile)}
                  </div>
                  <h3 className="text-xl font-medium mb-2">{activeFile.filename}</h3>
                  <p>Type: {activeFile.type}</p>
                  <p>Size: {formatBytes(activeFile.size)}</p>
                  <Button 
                    className="mt-4" 
                    variant="outline"
                    onClick={() => window.open(activeFile.url, '_blank')}
                  >
                    Download File
                  </Button>
                </div>
              )}
              
              {/* Navigation buttons */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10"
                onClick={() => navigateFiles('prev')}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10"
                onClick={() => navigateFiles('next')}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
              
              {/* Close button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
                onClick={() => setActiveFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              
              {/* Info button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-16 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
                onClick={() => setShowFileInfo(!showFileInfo)}
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
            
            {/* File info panel */}
            <Sheet open={showFileInfo} onOpenChange={setShowFileInfo}>
              <SheetContent className="w-[350px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>File Information</SheetTitle>
                </SheetHeader>
                
                {activeFile && (
                  <div className="py-4">
                    <Tabs defaultValue="details">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="metadata">Metadata</TabsTrigger>
                        <TabsTrigger value="tags">Tags</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="details" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="font-medium">Filename</div>
                          <div>{activeFile.filename}</div>
                          
                          <div className="font-medium">Type</div>
                          <div>{activeFile.type}</div>
                          
                          <div className="font-medium">Size</div>
                          <div>{formatBytes(activeFile.size)}</div>
                          
                          <div className="font-medium">Date</div>
                          <div>{new Date(activeFile.upload_date).toLocaleString()}</div>
                          
                          <div className="font-medium">Album</div>
                          <div>{activeFile.album || 'Not assigned'}</div>
                          
                          <div className="font-medium">People</div>
                          <div>
                            {activeFile.faces && activeFile.faces.length > 0 
                              ? activeFile.faces.join(', ') 
                              : 'No people tagged'}
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="metadata" className="space-y-4 mt-4">
                        {activeFile.metadata && Object.keys(activeFile.metadata).length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(activeFile.metadata).map(([key, value]) => (
                              <React.Fragment key={key}>
                                <div className="font-medium">{key}</div>
                                <div>{String(value)}</div>
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No metadata available</p>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="tags" className="mt-4">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Album</h4>
                            <div className="flex flex-wrap gap-2">
                              {['Work', 'Personal', 'Projects', 'Archive', 'Important'].map(album => (
                                <Badge 
                                  key={album}
                                  variant={activeFile.album === album ? 'blue' : 'gray'} 
                                  className="cursor-pointer"
                                  onClick={() => handleAddToAlbum(activeFile, album)}
                                >
                                  {album}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
                
                <SheetFooter>
                  <Button variant="ghost" onClick={() => setShowFileInfo(false)}>Close</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileGallery;
