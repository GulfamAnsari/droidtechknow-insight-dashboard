import React, { useState, useEffect } from 'react';
import { useDashboard } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import UploadArea from "@/components/gallery/UploadArea";
import FileGrid from "@/components/files/FileGrid";
import { Loader2, Search, Grid3X3, LayoutGrid, FolderPlus, Upload, Cloud, FileImage, FileVideo, FileText, FileAudio, File, Menu, ZoomIn, ZoomOut, Download, ArrowDown, ArrowUp, Info, Trash2, UserCircle, ChevronLeft, ChevronRight, Plus, FolderOpen, Share2, Users } from "lucide-react";
import { albumApi, Album, CreateAlbumRequest } from "@/services/albumApi";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogFooter, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { getFileType, getFileIcon, formatFileSize, groupFilesByDate, formatDate, getFileTypeLabel, downloadFile, DownloadButton } from "@/components/files/FileUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Slider } from "@/components/ui/slider";
import { useSwipeable } from "react-swipeable";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import httpClient from '@/utils/httpClient';
import { ShareDialog } from "@/components/files/ShareDialog";
import { shareApi, ShareItem } from "@/services/shareApi";

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
  thumbnail: string;
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
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumDescription, setNewAlbumDescription] = useState("");
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedAlbums, setSelectedAlbums] = useState<string[]>([]);
  const [isSharedView, setIsSharedView] = useState(false);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Initialize swipe handlers
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
        const data = await httpClient.get("https://droidtechknow.com/admin/api/files/get_files.php");
        
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
          metadata: file.metadata || {},
          thumbnail: file?.thumbnail
        }));
      } catch (error) {
        console.error("Error fetching files:", error);
        throw error;
      }
    }
  });

 // Fetch albums
  const { data: albums = [], isLoading: albumsLoading } = useQuery({
    queryKey: ["albums"],
    queryFn: () => albumApi.getAlbums()
  });

  // Create album mutation
  const createAlbumMutation = useMutation({
    mutationFn: (data: CreateAlbumRequest) => albumApi.createAlbum(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success("Album created successfully");
      setIsCreateAlbumOpen(false);
      setNewAlbumName("");
      setNewAlbumDescription("");
    },
    onError: (error) => {
      console.error("Error creating album:", error);
      toast.error("Failed to create album");
    }
  });

  // Delete album mutation
  const deleteAlbumMutation = useMutation({
    mutationFn: (albumName: string) => albumApi.deleteAlbum({ album: albumName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success("Album deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting album:", error);
      toast.error("Failed to delete album");
    }
  });

  // Fetch shared content
  const { data: sharedContent, isLoading: sharedContentLoading } = useQuery({
    queryKey: ["shared-content", user?.id],
    queryFn: async () => {
      if (!user?.id) return { albums: [], photos: [] };
      
      const shareData: ShareItem[] = await shareApi.getSharedContent(user.id);
      console.log("Share data:", shareData);
      
      if (!shareData || shareData.length === 0) {
        return { albums: [], photos: [] };
      }

      const allSharedPhotos = [];
      const allSharedAlbums = [];

      // Loop through shared data and fetch actual content
      for (const share of shareData) {
        if (share.fromUserId) {
          try {
            // Fetch photos and albums from the sharing user
            const [photosResponse, albumsResponse] = await Promise.all([
              httpClient.get("https://droidtechknow.com/admin/api/files/get_files.php?id=" + share.fromUserId),
              httpClient.get("https://droidtechknow.com/admin/api/files/album.php?id=" + share.fromUserId)
            ]);

            // Filter photos that were actually shared
            if (share.photos && photosResponse) {
              const sharedPhotos = photosResponse.filter((photo: any) => 
                share.photos.includes(photo.id)
              ).map((photo: any) => ({
                ...photo,
                id: photo.id || String(Math.random()),
                url: photo.url,
                title: photo.title || 'Unnamed',
                description: photo.description,
                createdAt: photo.createdAt,
                lastModified: photo.lastModified || Date.now().toString(),
                location: photo.location,
                album: photo.album,
                favorite: photo.favorite || false,
                fileType: photo.fileType || getFileType(photo.title, photo.metadata?.format || ''),
                metadata: photo.metadata || {},
                thumbnail: photo?.thumbnail,
                sharedBy: share.fromUserId
              }));
              allSharedPhotos.push(...sharedPhotos);
            }

            // Filter albums that were actually shared
            if (share.albums && albumsResponse?.albums) {
              const sharedAlbums = albumsResponse.albums.filter((album: any) => 
                share.albums.includes(album.id || album.name)
              ).map((album: any) => ({
                ...album,
                sharedBy: share.fromUserId
              }));
              allSharedAlbums.push(...sharedAlbums);
            }
          } catch (error) {
            console.error("Error fetching shared content from user:", share.fromUserId, error);
          }
        }
      }

      return { albums: allSharedAlbums, photos: allSharedPhotos };
    },
    enabled: !!user?.id
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileIds: string[]) => {
      const results = [];
      
      for (const fileId of fileIds) {
        const response = await httpClient.post('https://droidtechknow.com/admin/api/files/delete.php', { id: fileId });
        
        const result = response;
        results.push(result);
        
        // Remove the file from local storage too
        setLocalFiles(prev => prev.filter(file => file.id !== fileId));
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success(filesToDelete.length > 1 
        ? `${filesToDelete.length} files deleted successfully` 
        : "File deleted successfully");
      setSelectedFiles([]);
      setFilesToDelete([]);
      setIsSelectionMode(false);
    },
    onError: (error) => {
      console.error("Error deleting files:", error);
      toast.error("Failed to delete files. Please try again.");
    }
  });

  // Combine API files with local modifications and shared content
  let allFiles = apiFiles ? apiFiles.map(apiFile => {
    const localFile = localFiles.find(local => local.id === apiFile.id);
    return localFile ? { ...apiFile, ...localFile } : apiFile;
  }) : [];

  // Add shared files when viewing shared content
  if (isSharedView && sharedContent) {
    allFiles = sharedContent.photos || [];
  }

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
    setFilesToDelete([fileId]);
    setIsDeleteDialogOpen(true);
  };
  
  const handleBulkDeleteFiles = () => {
    if (selectedFiles.length > 0) {
      setFilesToDelete([...selectedFiles]);
      setIsDeleteDialogOpen(true);
    }
  };
  
  const confirmDeleteFiles = () => {
    if (filesToDelete.length > 0) {
      deleteFileMutation.mutate(filesToDelete);
      setIsDeleteDialogOpen(false);
    }
  };
  
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };
  
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedFiles([]);
    }
  };

  const handleCreateAlbum = () => {
    if (!newAlbumName.trim()) {
      toast.error("Please enter an album name");
      return;
    }
    createAlbumMutation.mutate({
      album: newAlbumName.trim(),
      description: newAlbumDescription.trim() || undefined
    });
  };

  const handleDeleteAlbum = (albumName: string) => {
    if (confirm(`Are you sure you want to delete the album "${albumName}"?`)) {
      deleteAlbumMutation.mutate(albumName);
    }
  };

  const handleShare = () => {
    if (selectedFiles.length === 0 && selectedAlbums.length === 0) {
      toast.error("Please select files or albums to share");
      return;
    }
    setIsShareDialogOpen(true);
  };

  const handleShareComplete = () => {
    setSelectedFiles([]);
    setSelectedAlbums([]);
    setIsSelectionMode(false);
  };

  const toggleAlbumSelection = (albumName: string) => {
    setSelectedAlbums(prev => {
      if (prev.includes(albumName)) {
        return prev.filter(name => name !== albumName);
      } else {
        return [...prev, albumName];
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
      id: 'shared', 
      name: 'Shared with Me', 
      count: sharedContent?.photos?.length || 0, 
      type: 'folder',
      icon: <Users className="h-4 w-4 mr-2" /> 
    },
    { 
      id: 'shared-by-me', 
      name: 'Shared by Me', 
      count: 0, // Will be calculated separately
      type: 'folder',
      icon: <Share2 className="h-4 w-4 mr-2" /> 
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
    // Albums from API
    ...albums?.map(album => ({ 
      id: `album-${album.name}`, 
      name: album.name,
      count: filteredFiles.filter(p => p.album === album.name).length,
      type: 'album' as const,
      icon: <FolderOpen className="h-4 w-4 mr-2" />
    })),
    // Legacy albums from files (in case API albums are not synced)
    ...Array.from(new Set(filteredFiles.filter(p => p.album && !albums.find(a => a.name === p.album)).map(p => p.album as string)))
      .map(album => ({ 
        id: `album-${album}`, 
        name: album as string,
        count: filteredFiles.filter(p => p.album === album).length,
        type: 'album' as const,
        icon: <FolderOpen className="h-4 w-4 mr-2" />
      })),
  ];
  
  // Fetch items shared by current user
  const { data: sharedByMeContent } = useQuery({
    queryKey: ["shared-by-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return { albums: [], photos: [] };
      
      try {
        // This would need a new API endpoint to get items shared BY the current user
        // For now, we'll return empty data
        return { albums: [], photos: [] };
      } catch (error) {
        console.error("Error fetching content shared by user:", error);
        return { albums: [], photos: [] };
      }
    },
    enabled: !!user?.id
  });

  // Update shared view state when selected category changes
  useEffect(() => {
    setIsSharedView(selectedCategory === 'shared' || selectedCategory === 'shared-by-me');
  }, [selectedCategory]);

  // Get files for the selected category
  let displayFiles = filteredFiles;
  if (selectedCategory) {
    if (selectedCategory === 'shared') {
      displayFiles = sharedContent?.photos || [];
    } else if (selectedCategory === 'shared-by-me') {
      displayFiles = sharedByMeContent?.photos || [];
    } else if (selectedCategory === 'recent') {
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
    if (isSelectionMode) {
      toggleFileSelection(file.id);
    } else {
      setSelectedFile(file);
      setIsPreviewOpen(true);
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
  const handleBulkSelection = (selectedFiles: string[]) => {
    setSelectedFiles(selectedFiles);
  };
  
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden w-full inner-container">
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
            <div className="mt-4">
              <div className="flex items-center px-3 mb-2">
                <h3 className="font-medium text-sm">Categories</h3>
              </div>
              {categories.filter(c => c.type === 'folder' || c.type === 'filetype').map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id === selectedCategory ? null : category.id);
                    if (isMobile) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors hover:bg-muted ${
                    selectedCategory === category.id ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  <div className="flex items-center">
                    {category.icon}
                    <span className="truncate">{category.name}</span>
                  </div>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {category.count}
                  </Badge>
                </button>
              ))}
            </div>
            
            <div className="mt-4">
              <div className="flex items-center justify-between px-3 mb-2">
                <h3 className="font-medium text-sm">Albums</h3>
                <Dialog open={isCreateAlbumOpen} onOpenChange={setIsCreateAlbumOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Album</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="album-name">Album Name</Label>
                        <Input
                          id="album-name"
                          value={newAlbumName}
                          onChange={(e) => setNewAlbumName(e.target.value)}
                          placeholder="Enter album name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="album-description">Description (optional)</Label>
                        <Input
                          id="album-description"
                          value={newAlbumDescription}
                          onChange={(e) => setNewAlbumDescription(e.target.value)}
                          placeholder="Enter album description"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateAlbumOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateAlbum}
                        disabled={createAlbumMutation.isPending}
                      >
                        {createAlbumMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Album'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              {categories.filter(c => c.type === 'album').map((category) => (
                <div key={category.id} className="relative group">
                  <button
                    onClick={() => {
                      setSelectedCategory(category.id === selectedCategory ? null : category.id);
                      if (isMobile) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors hover:bg-muted ${
                      selectedCategory === category.id ? 'bg-primary text-primary-foreground' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      {isSelectionMode && (
                        <Checkbox 
                          checked={selectedAlbums.includes(category.name)} 
                          onCheckedChange={() => toggleAlbumSelection(category.name)}
                          className="mr-2 h-4 w-4"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      {category.icon}
                      <span className="truncate">{category.name}</span>
                    </div>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {category.count}
                    </Badge>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAlbum(category.name);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {categories.filter(c => c.type === 'album').length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No albums yet</p>
              )}
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
            {viewMode === "grid" && !isSelectionMode && (
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
            
            <Button 
              variant={isSelectionMode ? "default" : "outline"} 
              size="sm" 
              onClick={toggleSelectionMode}
              className="gap-2"
            >
              <Checkbox checked={isSelectionMode} className="h-4 w-4" />
              {isSelectionMode ? "Cancel" : "Select"}
            </Button>
            
            {isSelectionMode && selectedFiles.length > 0 && (
              <>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleBulkDeleteFiles}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedFiles.length})
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleShare}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share ({selectedFiles.length + selectedAlbums.length})
                </Button>
              </>
            )}
            
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <UploadArea 
                  onUploadSuccess={handleUploadSuccess} 
                  userId={user?.id} 
                  album={selectedCategory?.startsWith('album-') ? selectedCategory.replace('album-', '') : undefined}
                />
              </DialogContent>
            </Dialog>
          </div>
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
                        {isSelectionMode && (
                          <div className="absolute top-2 left-2 z-10">
                            <Checkbox 
                              checked={selectedFiles.includes(file.id)} 
                              onCheckedChange={() => toggleFileSelection(file.id)}
                              className="h-5 w-5 bg-white border-2 border-primary rounded"
                            />
                          </div>
                        )}
                        <div 
                          className={`bg-muted rounded-md overflow-hidden flex items-center justify-center border transition-all ${
                            isSelectionMode && selectedFiles.includes(file.id) 
                              ? 'border-primary border-2' 
                              : 'hover:border-primary'
                          }`}
                          style={{ height: `${gridSize}px`, width: `${gridSize}px`}}
                        >
                          {/* File preview */}
                          {file.fileType === 'photo' ? (
                            <img
  loading="lazy"
                              src={file.url.startsWith('http') ? file.thumbnail || file.url : `https://droidtechknow.com/admin/api/files/uploads/${file.thumbnail || file.url}`} 
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
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 rounded-full bg-black/30 text-white hover:bg-black/60"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFiles([file.id]);
                                setIsShareDialogOpen(true);
                              }}
                            >
                              <Share2 className="h-3.5 w-3.5" />
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
            // List view
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {isSelectionMode && <th className="p-2"><Checkbox /></th>}
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
                      className={`hover:bg-muted/50 cursor-pointer ${
                        isSelectionMode && selectedFiles.includes(file.id) ? 'bg-muted/80' : ''
                      }`} 
                      onClick={() => handleFileClick(file)}
                    >
                      {isSelectionMode && (
                        <td className="p-2" onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={selectedFiles.includes(file.id)} 
                            onCheckedChange={() => toggleFileSelection(file.id)}
                          />
                        </td>
                      )}
                      <td className="p-2">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-muted rounded overflow-hidden flex items-center justify-center">
                            {file.fileType === 'photo' ? (
                              <img
  loading="lazy"
                                src={file.url.startsWith('http') ? file.url : `https://droidtechknow.com/admin/api/files/uploads/${file.url}`} 
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
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFiles([file.id]);
                            setIsShareDialogOpen(true);
                          }}>
                            <Share2 className="h-4 w-4" />
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
  loading="lazy"
                    src={selectedFile?.url.startsWith('http') ? selectedFile.url : `https://droidtechknow.com/admin/api/files/uploads/${selectedFile.url}`} 
                    alt={selectedFile?.title} 
                    className="max-h-full max-w-full object-contain"
                    style={{ maxHeight: 'calc(90vh - 140px)' }} // Ensure image fits within the container
                  />
                ) : selectedFile?.fileType === 'video' ? (
                  <video 
                    src={selectedFile?.url.startsWith('http') ? selectedFile.url : `https://droidtechknow.com/admin/api/files/uploads/${selectedFile.url}`} 
                    controls 
                    className="max-h-full max-w-full" 
                  />
                ) : selectedFile?.fileType === 'audio' ? (
                  <div className="p-8 w-full">
                    <audio src={selectedFile?.url.startsWith('http') ? selectedFile.url : `https://droidtechknow.com/admin/api/files/uploads/${selectedFile.url}`} controls className="w-full" />
                    <div className="mt-4 flex justify-center">
                      {selectedFile && getFileIcon(selectedFile.fileType, selectedFile.metadata?.format || '')}
                    </div>
                  </div>
                ) : selectedFile?.fileType === 'document' && selectedFile?.metadata?.format === 'application/pdf' ? (
                  <iframe 
                    src={`${selectedFile?.url.startsWith('http') ? selectedFile.url : `https://droidtechknow.com/admin/api/files/uploads/${selectedFile.url}`}#toolbar=0`} 
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {filesToDelete.length > 1 ? 'Files' : 'File'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {filesToDelete.length > 1 ? `these ${filesToDelete.length} files` : 'this file'}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteFiles}
              disabled={deleteFileMutation.isPending}
            >
              {deleteFileMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        selectedFiles={selectedFiles}
        selectedAlbums={selectedAlbums}
        onShareComplete={handleShareComplete}
      />
    </div>
  );
};

export default MyFiles;
