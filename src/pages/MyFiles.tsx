import React, { useState, useEffect } from 'react';
import { useDashboard } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import UploadArea from "@/components/files/UploadArea";
import FileGrid from "@/components/files/FileGrid";
import { Loader2, Search, Grid3X3, LayoutGrid, FolderPlus, Upload, Cloud, FileImage, FileVideo, FileText, FileAudio, File, Menu, ZoomIn, ZoomOut, Download, ArrowDown, ArrowUp, Info, Trash2, UserCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { getFileType, getFileIcon, formatFileSize, groupFilesByDate, formatDate, getFileTypeLabel, downloadFile, DownloadButton } from "@/components/files/FileUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Slider } from "@/components/ui/slider";
import { useSwipeable } from "react-swipeable";

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

interface Category {
  id: string;
  name: string;
  count: number;
  type: 'folder' | 'album' | 'tag' | 'filetype';
  icon?: React.ReactNode;
}

// Get localStorage key for files
const LOCAL_STORAGE_KEY = 'my-files-data';

const MyFiles = () => {
  const { refreshData, isRefreshing } = useDashboard();
  const [searchQuery, setSearchQuery] = useState("");
  const [localFiles, setLocalFiles] = useState<FileItem[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [gridSize, setGridSize] = useState<number>(150);
  const isMobile = useIsMobile();
  
  // Initialize swipe handlers regardless of conditions
  // This ensures hooks are called in the same order on every render
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => selectedFile && navigateFile('next'),
    onSwipedRight: () => selectedFile && navigateFile('prev'),
    trackMouse: false
  });
  
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
        
        return data.map((file: any) => ({
          id: file.id || String(Math.random()),
          url: file.url,
          title: file.title || 'Unnamed',
          description: file.description,
          createdAt: file.createdAt,
          lastModified: file.lastModified || Date.now().toString(),
          location: file.location,
          album: file.album,
          favorite: file.favorite || false,
          fileType: file.fileType || getFileType(file.title, file.metadata?.format || ''),
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
    file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (file.album && file.album.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (file.description && file.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const handleRefresh = () => {
    refreshData();
    refetch();
    toast.success("Files refreshed");
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

  const handleDeleteFile = (fileId: string) => {
    // In a real app, you would call an API to delete the file
    // For now, we'll just remove it from local state
    setLocalFiles(files => files.filter(file => file.id !== fileId));
    
    // If the deleted file is currently selected, close the preview
    if (selectedFile?.id === fileId) {
      setIsPreviewOpen(false);
      setSelectedFile(null);
    }
    
    toast.success("File deleted successfully");
  };

  // Calculate storage statistics
  const storageStats = {
    total: allFiles.reduce((total, file) => total + (file.metadata?.size || 0), 0),
    images: allFiles.filter(file => file.fileType === 'photo').reduce((total, file) => total + (file.metadata?.size || 0), 0),
    videos: allFiles.filter(file => file.fileType === 'video').reduce((total, file) => total + (file.metadata?.size || 0), 0),
    documents: allFiles.filter(file => file.fileType === 'document').reduce((total, file) => total + (file.metadata?.size || 0), 0),
    audio: allFiles.filter(file => file.fileType === 'audio').reduce((total, file) => total + (file.metadata?.size || 0), 0),
    other: allFiles.filter(file => file.fileType === 'other').reduce((total, file) => total + (file.metadata?.size || 0), 0)
  };
  
  // Count files by type
  const fileTypeCounts = {
    images: allFiles.filter(file => file.fileType === 'photo').length,
    videos: allFiles.filter(file => file.fileType === 'video').length,
    audio: allFiles.filter(file => file.fileType === 'audio').length,
    documents: allFiles.filter(file => file.fileType === 'document').length,
    other: allFiles.filter(file => !['photo', 'video', 'audio', 'document'].includes(file.fileType)).length,
  };

  // Create categories based on the data
  const categories: Category[] = [
    { 
      id: 'all', 
      name: 'All Files', 
      count: filteredFiles.length, 
      type: 'folder', 
      icon: <Cloud className="h-4 w-4 mr-2" /> 
    },
    { 
      id: 'recent', 
      name: 'Recent', 
      count: filteredFiles.filter(p => {
        const uploadDate = new Date(parseInt(p.lastModified));
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return uploadDate > oneWeekAgo;
      }).length, 
      type: 'folder' 
    },
    { 
      id: 'filetype-images', 
      name: 'Images', 
      count: fileTypeCounts.images, 
      type: 'filetype',
      icon: <FileImage className="h-4 w-4 mr-2" />
    },
    { 
      id: 'filetype-videos', 
      name: 'Videos', 
      count: fileTypeCounts.videos, 
      type: 'filetype',
      icon: <FileVideo className="h-4 w-4 mr-2" />
    },
    { 
      id: 'filetype-documents', 
      name: 'Documents', 
      count: fileTypeCounts.documents, 
      type: 'filetype',
      icon: <FileText className="h-4 w-4 mr-2" />
    },
    { 
      id: 'filetype-audio', 
      name: 'Audio', 
      count: fileTypeCounts.audio, 
      type: 'filetype',
      icon: <FileAudio className="h-4 w-4 mr-2" />
    },
    { 
      id: 'filetype-other', 
      name: 'Other', 
      count: fileTypeCounts.other, 
      type: 'filetype',
      icon: <File className="h-4 w-4 mr-2" />
    },
    ...Array.from(new Set(filteredFiles.filter(p => p.album).map(p => p.album as string)))
      .map(album => ({ 
        id: `album-${album}`, 
        name: album as string,
        count: filteredFiles.filter(p => p.album === album).length,
        type: 'album' as const
      })),
  ];
  
  // Get files for the selected category
  let displayFiles = filteredFiles;
  if (selectedCategory) {
    if (selectedCategory === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      displayFiles = filteredFiles.filter(p => new Date(parseInt(p.lastModified)) > oneWeekAgo);
    } else if (selectedCategory.startsWith('album-')) {
      const albumName = selectedCategory.replace('album-', '');
      displayFiles = filteredFiles.filter(p => p.album === albumName);
    } else if (selectedCategory.startsWith('filetype-')) {
      const fileType = selectedCategory.replace('filetype-', '');
      if (fileType === 'images') {
        displayFiles = filteredFiles.filter(p => p.fileType === 'photo');
      } else if (fileType === 'videos') {
        displayFiles = filteredFiles.filter(p => p.fileType === 'video');
      } else if (fileType === 'audio') {
        displayFiles = filteredFiles.filter(p => p.fileType === 'audio');
      } else if (fileType === 'documents') {
        displayFiles = filteredFiles.filter(p => p.fileType === 'document');
      } else if (fileType === 'other') {
        displayFiles = filteredFiles.filter(p => !['photo', 'video', 'audio', 'document'].includes(p.fileType));
      }
    }
  }

  // Group by date for display, using the correct date from lastModified or createdAt
  const filesByDate = groupFilesByDate(displayFiles);
  const dates = Object.keys(filesByDate).sort().reverse(); // Most recent first
  
  // Handle file click to show preview
  const handleFileClick = (file: FileItem) => {
    setSelectedFile(file);
    setIsPreviewOpen(true);
    if (onViewFile) {
      onViewFile(file);
    }
  };

  // Function to navigate to next/prev file
  const navigateFile = (direction: 'next' | 'prev') => {
    if (!selectedFile || !displayFiles || displayFiles.length <= 1) return;
    
    const currentIndex = displayFiles.findIndex(file => file.id === selectedFile.id);
    if (currentIndex === -1) return;
    
    let newIndex;
    
    if (direction === 'next') {
      newIndex = currentIndex === displayFiles.length - 1 ? 0 : currentIndex + 1;
    } else {
      newIndex = currentIndex === 0 ? displayFiles.length - 1 : currentIndex - 1;
    }
    
    setSelectedFile(displayFiles[newIndex]);
  };

  // Define grid size options
  const gridSizeOptions = [
    { name: "Small", size: 120 },
    { name: "Medium", size: 150 },
    { name: "Large", size: 200 },
    { name: "X-Large", size: 250 }
  ];
  
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
        <p className="text-destructive mb-4">Failed to load files</p>
        <button 
          onClick={() => refetch()} 
          className="text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }
  
  // Fix the bulk selection callback
  const handleBulkSelection = (selectedFiles: any[]) => {
    // Handle bulk selection logic
    console.log("Selected files for bulk action:", selectedFiles);
  };
  
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden w-full">
      {/* Mobile sidebar toggle - now positioned properly in top left */}
      {isMobile && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute left-4 top-4 z-50 h-10 w-10"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      
      {/* Sidebar */}
      <div className={`${isMobile ? 'fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out' : 'w-64'} 
                       ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'} 
                       bg-background border-r flex flex-col h-full overflow-hidden`}>
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg flex items-center">
            <Cloud className="mr-2 h-5 w-5 text-primary" /> My Cloud
          </h2>
          <p className="text-xs text-muted-foreground">Manage your files and documents</p>
        </div>
        
        {/* Storage usage section */}
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium mb-2">Storage</h3>
          <div className="space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${Math.min((storageStats.total / (1024*1024*1000)) * 100, 100)}%` }}></div>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatFileSize(storageStats.total)} used of 1 GB
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="text-xs">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-blue-500 rounded-full mr-1"></div>
                  <span>Images</span>
                </div>
                <div className="mt-1 font-medium">{formatFileSize(storageStats.images)}</div>
              </div>
              <div className="text-xs">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-red-500 rounded-full mr-1"></div>
                  <span>Videos</span>
                </div>
                <div className="mt-1 font-medium">{formatFileSize(storageStats.videos)}</div>
              </div>
              <div className="text-xs">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-1"></div>
                  <span>Docs</span>
                </div>
                <div className="mt-1 font-medium">{formatFileSize(storageStats.documents)}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <div className="pt-4 px-2">
            <div className="mb-4">
              <div className="flex items-center px-3 mb-2">
                <h3 className="font-medium text-sm">Categories</h3>
              </div>
              <ul className="space-y-1">
                {categories.filter(c => c.type === 'folder' || c.type === 'filetype').map((category) => (
                  <li key={category.id}>
                    <button
                      onClick={() => {
                        setSelectedCategory(category.id === 'all' ? null : category.id);
                        if (isMobile) setSidebarOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-md flex items-center justify-between text-sm ${
                        (category.id === 'all' && !selectedCategory) || selectedCategory === category.id 
                          ? 'bg-accent text-accent-foreground' 
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-center">
                        {category.icon || <Cloud className="h-4 w-4 mr-2" />}
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
                        onClick={() => {
                          setSelectedCategory(category.id);
                          if (isMobile) setSidebarOpen(false);
                        }}
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
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
        {/* Header */}
        <div className="border-b p-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Add proper spacing for mobile menu toggle */}
            <div className={`relative w-full md:w-80`}>
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground ml-2" />
              <Input 
                placeholder="Search files..." 
                className="pl-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {viewMode === "grid" && (
              <div className="flex items-center space-x-2 mr-2">
                <Slider 
                  className="w-24" 
                  value={[gridSize]} 
                  min={50} 
                  max={1000} 
                  step={10}
                  onValueChange={(value) => setGridSize(value[0])}
                />
              </div>
            )}
            
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
              <Button size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <UploadArea onUploadSuccess={handleUploadSuccess} />
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-auto p-4 md:p-6" style={{ scrollbarWidth: "none" }}>
          {/* File type cards - hidden on mobile */}
          {!isMobile && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4 mb-6 md:mb-8">
              <Card className="hover:shadow-md cursor-pointer" onClick={() => setSelectedCategory('filetype-images')}>
                <CardContent className="p-3 md:p-4 flex items-center space-x-2 md:space-x-4">
                  <div className="p-2 md:p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <FileImage className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm md:text-base">Images</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{fileTypeCounts.images} files</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md cursor-pointer" onClick={() => setSelectedCategory('filetype-videos')}>
                <CardContent className="p-3 md:p-4 flex items-center space-x-2 md:space-x-4">
                  <div className="p-2 md:p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                    <FileVideo className="h-6 w-6 md:h-8 md:w-8 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm md:text-base">Videos</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{fileTypeCounts.videos} files</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md cursor-pointer" onClick={() => setSelectedCategory('filetype-documents')}>
                <CardContent className="p-3 md:p-4 flex items-center space-x-2 md:space-x-4">
                  <div className="p-2 md:p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <FileText className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm md:text-base">Documents</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{fileTypeCounts.documents} files</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md cursor-pointer" onClick={() => setSelectedCategory('filetype-audio')}>
                <CardContent className="p-3 md:p-4 flex items-center space-x-2 md:space-x-4">
                  <div className="p-2 md:p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <FileAudio className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm md:text-base">Audio</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{fileTypeCounts.audio} files</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md cursor-pointer" onClick={() => setSelectedCategory('filetype-other')}>
                <CardContent className="p-3 md:p-4 flex items-center space-x-2 md:space-x-4">
                  <div className="p-2 md:p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <File className="h-6 w-6 md:h-8 md:w-8 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm md:text-base">Other</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{fileTypeCounts.other} files</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
       
          
          {displayFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
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
                <div key={date} className="space-y-3" style={{ margin: '0 0 4rem 0'}}>
                  <h3 className="font-medium">
                    {formatDate(filesByDate[date][0].lastModified)}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap'}} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {filesByDate[date].map((file) => (
                      <div 
                        key={file.id}
                        className="group relative cursor-pointer mb-14"
                        onClick={() => handleFileClick(file)}
                        style={{ height: `${gridSize}px`, width: `${gridSize}px`}}
                      >
                        <div 
                          className="bg-muted rounded-md overflow-hidden flex items-center justify-center border hover:border-primary transition-all"
                          style={{ height: `${gridSize}px`, width: `${gridSize}px`}}
                        >
                          {file.fileType === 'photo' ? (
                            <img 
                              src={file.url.startsWith('http') ? file.url : `https://droidtechknow.com/admin/${file.url}`} 
                              alt={file.title}
                              className="h-full w-full object-cover"
                            />
                          ) : file.fileType === 'video' ? (
                            <div className="relative h-full w-full bg-black flex items-center justify-center">
                              <FileVideo className="h-10 w-10 text-red-500" />
                            </div>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              {getFileIcon(file.fileType, file.metadata?.format || '')}
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end items-start p-2 gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 rounded-full bg-black/30 text-white hover:bg-black/60"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(file);
                                setIsPreviewOpen(true);
                              }}
                            >
                              <Info className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 rounded-full bg-black/30 text-white hover:bg-black/60"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFile(file.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 rounded-full bg-black/30 text-white hover:bg-black/60"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(file);
                              }}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between items-center w-full">
                          <div className='w-full'>
                            <p style={{ whiteSpace: 'wrap '}} className="text-xs truncate">{file.title}</p>
                            <p style={{ whiteSpace: 'wrap '}} className="text-[10px] text-muted-foreground">
                              {getFileTypeLabel(file.fileType)} • {formatFileSize(file.metadata?.size || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // List view - updated to have same click functionality as grid
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-sm p-2">Name</th>
                    <th className="text-left font-medium text-sm p-2">Type</th>
                    <th className="text-left font-medium text-sm p-2">Date</th>
                    <th className="text-left font-medium text-sm p-2">Size</th>
                    <th className="text-left font-medium text-sm p-2">Album</th>
                    <th className="text-left font-medium text-sm p-2">Actions</th>
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
                          <div className="h-10 w-10 bg-muted rounded overflow-hidden flex items-center justify-center">
                            {file.fileType === 'photo' ? (
                              <img 
                                src={file.url.startsWith('http') ? file.url : `https://droidtechknow.com/admin/${file.url}`} 
                                alt={file.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getFileIcon(file.fileType, file.metadata?.format || '')
                            )}
                          </div>
                          <span className="text-sm">{file.title}</span>
                        </div>
                      </td>
                      <td className="p-2 text-sm">
                        {getFileTypeLabel(file.fileType)}
                      </td>
                      <td className="p-2 text-sm">
                        {new Date(parseInt(file.lastModified)).toLocaleDateString()}
                      </td>
                      <td className="p-2 text-sm">
                        {file.metadata?.size ? formatFileSize(file.metadata.size) : 'Unknown'}
                      </td>
                      <td className="p-2 text-sm">
                        {file.album ? (
                          <Badge variant="blue">{file.album}</Badge>
                        ) : "-"}
                      </td>
                      <td className="p-2 text-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(file);
                            setIsPreviewOpen(true);
                          }}>
                            <Info className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id);
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(file);
                          }}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Full-screen File Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">File Preview</DialogTitle>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{selectedFile?.title}</h3>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => selectedFile && handleDeleteFile(selectedFile.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectedFile && downloadFile(selectedFile)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
            
            <div className="relative flex-1 bg-black/5 overflow-hidden flex items-center justify-center" {...swipeHandlers}>
              {/* Fixed position navigation buttons with consistent positioning */}
              <button 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/30 text-white p-2 rounded-full z-10 hover:bg-black/50 w-10 h-10 flex items-center justify-center"
                onClick={() => navigateFile('prev')}
                aria-label="Previous file"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              {/* File preview container with fixed max dimensions */}
              <div className="w-full h-full flex items-center justify-center">
                {selectedFile?.fileType === 'photo' ? (
                  <img 
                    src={selectedFile?.url.startsWith('http') ? selectedFile.url : `https://droidtechknow.com/admin/${selectedFile.url}`} 
                    alt={selectedFile?.title} 
                    className="max-h-full max-w-full object-contain"
                    style={{ maxHeight: 'calc(90vh - 140px)' }} // Ensure image fits within the container
                  />
                ) : selectedFile?.fileType === 'video' ? (
                  <video 
                    src={selectedFile?.url.startsWith('http') ? selectedFile.url : `https://droidtechknow.com/admin/${selectedFile.url}`} 
                    controls 
                    className="max-h-full max-w-full" 
                  />
                ) : selectedFile?.fileType === 'audio' ? (
                  <div className="p-8 w-full">
                    <audio src={selectedFile?.url.startsWith('http') ? selectedFile.url : `https://droidtechknow.com/admin/${selectedFile.url}`} controls className="w-full" />
                    <div className="mt-4 flex justify-center">
                      {selectedFile && getFileIcon(selectedFile.fileType, selectedFile.metadata?.format || '')}
                    </div>
                  </div>
                ) : selectedFile?.fileType === 'document' && selectedFile?.metadata?.format === 'application/pdf' ? (
                  <iframe 
                    src={`${selectedFile?.url.startsWith('http') ? selectedFile.url : `https://droidtechknow.com/admin/${selectedFile.url}`}#toolbar=0`} 
                    className="w-full h-full" 
                    title={selectedFile?.title}
                  />
                ) : (
                  <div className="text-center p-8">
                    <div className="flex justify-center mb-4">
                      {selectedFile && getFileIcon(selectedFile.fileType, selectedFile.metadata?.format || '')}
                    </div>
                    <p>Preview not available for this file type</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedFile && getFileTypeLabel(selectedFile.fileType)} - {selectedFile && formatFileSize(selectedFile.metadata.size || 0)}
                    </p>
                  </div>
                )}
              </div>
              
              <button 
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/30 text-white p-2 rounded-full z-10 hover:bg-black/50 w-10 h-10 flex items-center justify-center"
                onClick={() => navigateFile('next')}
                aria-label="Next file"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Mobile swipe hint - only shown on mobile */}
              {isMobile && (
                <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/30 py-1">
                  Swipe left or right to navigate
                </div>
              )}
            </div>
            
            <div className="p-4 text-sm bg-background border-t">
              <p><span className="font-medium">Type:</span> {selectedFile && getFileTypeLabel(selectedFile.fileType)}</p>
              <p><span className="font-medium">Size:</span> {selectedFile && formatFileSize(selectedFile.metadata?.size || 0)}</p>
              <p><span className="font-medium">Modified:</span> {selectedFile && formatDate(selectedFile.lastModified)}</p>
              {selectedFile?.description && (
                <p><span className="font-medium">Description:</span> {selectedFile.description}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyFiles;
