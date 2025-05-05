
import React, { useState, useEffect } from 'react';
import { useDashboard } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import UploadArea from "@/components/gallery/UploadArea";
import FileGrid from "@/components/files/FileGrid";
import { Loader2, Search, Grid3X3, LayoutGrid, FolderPlus, Upload, Cloud, FileImage, FileVideo, FileText, FileAudio } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFileType, getFileIcon, formatFileSize, groupFilesByDate, formatDate } from "@/components/files/FileUtils";

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

  // Calculate storage statistics
  const storageStats = {
    total: allFiles.reduce((total, file) => total + (file.metadata?.size || 0), 0),
    images: allFiles.filter(file => file.fileType === 'photo').reduce((total, file) => total + (file.metadata?.size || 0), 0),
    videos: allFiles.filter(file => file.fileType === 'video').reduce((total, file) => total + (file.metadata?.size || 0), 0),
    documents: allFiles.filter(file => file.fileType === 'document').reduce((total, file) => total + (file.metadata?.size || 0), 0),
    audio: allFiles.filter(file => file.fileType === 'audio').reduce((total, file) => total + (file.metadata?.size || 0), 0),
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
      }
    }
  }

  // Group by date for display
  const filesByDate = groupFilesByDate(displayFiles);
  const dates = Object.keys(filesByDate).sort().reverse(); // Most recent first
  
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
                      onClick={() => setSelectedCategory(category.id === 'all' ? null : category.id)}
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
                Upload Files
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <UploadArea onUploadSuccess={handleUploadSuccess} />
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-auto p-6">
          {/* File type cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="hover:shadow-md cursor-pointer" onClick={() => setSelectedCategory('filetype-images')}>
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <FileImage className="h-8 w-8 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Images</p>
                  <p className="text-sm text-muted-foreground">{fileTypeCounts.images} files</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md cursor-pointer" onClick={() => setSelectedCategory('filetype-videos')}>
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                  <FileVideo className="h-8 w-8 text-red-500" />
                </div>
                <div>
                  <p className="font-medium">Videos</p>
                  <p className="text-sm text-muted-foreground">{fileTypeCounts.videos} files</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md cursor-pointer" onClick={() => setSelectedCategory('filetype-documents')}>
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <FileText className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Documents</p>
                  <p className="text-sm text-muted-foreground">{fileTypeCounts.documents} files</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md cursor-pointer" onClick={() => setSelectedCategory('filetype-audio')}>
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <FileAudio className="h-8 w-8 text-yellow-500" />
                </div>
                <div>
                  <p className="font-medium">Audio</p>
                  <p className="text-sm text-muted-foreground">{fileTypeCounts.audio} files</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
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
                <div key={date} className="space-y-3">
                  <h3 className="font-medium">
                    {formatDate(date)}
                  </h3>
                  <FileGrid files={filesByDate[date]} />
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
                    <th className="text-left font-medium text-sm p-2">Date</th>
                    <th className="text-left font-medium text-sm p-2">Size</th>
                    <th className="text-left font-medium text-sm p-2">Album</th>
                  </tr>
                </thead>
                <tbody>
                  {displayFiles.map((file) => (
                    <tr 
                      key={file.id} 
                      className="hover:bg-muted/50 cursor-pointer" 
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
                        {formatDate(file.lastModified)}
                      </td>
                      <td className="p-2 text-sm">
                        {file.metadata?.size ? formatFileSize(file.metadata.size) : 'Unknown'}
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
    </div>
  );
};

export default MyFiles;
