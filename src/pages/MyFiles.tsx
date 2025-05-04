
import React, { useState } from 'react';
import { useDashboard } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Upload, File, FileText, FileImage, FileVideo, FileAudio, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import UploadArea from "@/components/gallery/UploadArea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FileItem {
  id: string;
  filename: string;
  type: string;
  size: number;
  lastModified: string;
  url: string;
}

interface DriveItem {
  id: string;
  name: string;
  type: string;
  color: string;
  size: string;
  usedPercent: number;
}

const MyFiles = () => {
  const { refreshData } = useDashboard();
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  // Sample file data for demonstration
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: "1",
      filename: "121548985.jpg",
      type: "image/jpeg",
      size: 0.6 * 1024 * 1024,
      lastModified: "2023-12-18T10:30:00Z",
      url: "https://example.com/image.jpg"
    },
    {
      id: "2",
      filename: "SpiderMan.mkv",
      type: "video/x-matroska",
      size: 9 * 1024 * 1024,
      lastModified: "2023-12-10T13:45:00Z",
      url: "https://example.com/video.mkv"
    },
    {
      id: "3",
      filename: "Wallpaper 86.jpg",
      type: "image/jpeg",
      size: 128.4 * 1024 * 1024,
      lastModified: "2023-12-07T09:15:00Z",
      url: "https://example.com/wallpaper.jpg"
    },
    {
      id: "4",
      filename: "Octobox.mp4",
      type: "video/mp4",
      size: 10.8 * 1024 * 1024,
      lastModified: "2023-12-15T08:20:00Z",
      url: "https://example.com/octobox.mp4"
    },
    {
      id: "5",
      filename: "Instrumental.40.mp3",
      type: "audio/mpeg",
      size: 8 * 1024 * 1024,
      lastModified: "2023-12-15T17:10:00Z",
      url: "https://example.com/music.mp3"
    },
    {
      id: "6",
      filename: "Unnamed.rar",
      type: "application/x-rar-compressed",
      size: 2.2 * 1024 * 1024,
      lastModified: "2023-12-18T14:30:00Z",
      url: "https://example.com/archive.rar"
    },
    {
      id: "7",
      filename: "Frame 4273188.png",
      type: "image/png",
      size: 7.01 * 1024 * 1024,
      lastModified: "2023-12-19T09:25:00Z",
      url: "https://example.com/frame.png"
    },
    {
      id: "8",
      filename: "3d-render.mp4",
      type: "video/mp4",
      size: 90.0 * 1024 * 1024,
      lastModified: "2023-12-19T11:45:00Z",
      url: "https://example.com/3drender.mp4"
    },
    {
      id: "9",
      filename: "5m-poster.jpg",
      type: "image/jpeg",
      size: 0.6 * 1024 * 1024,
      lastModified: "2023-12-09T16:20:00Z",
      url: "https://example.com/poster.jpg"
    }
  ]);

  // Sample drives
  const drives: DriveItem[] = [
    {
      id: "1",
      name: "Drive F",
      type: "personal",
      color: "blue",
      size: "2.4 GB total usage",
      usedPercent: 75
    },
    {
      id: "2",
      name: "Drive C",
      type: "work",
      color: "amber",
      size: "87 GB usage",
      usedPercent: 35
    },
    {
      id: "3",
      name: "Drive E",
      type: "backup",
      color: "orange",
      size: "12.9 GB storage",
      usedPercent: 55
    }
  ];

  // Filter files by search query
  const filteredFiles = files.filter(file => 
    file.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Count files by type
  const imageCount = filteredFiles.filter(f => f.type.startsWith('image/')).length;
  const videoCount = filteredFiles.filter(f => f.type.startsWith('video/')).length;
  const audioCount = filteredFiles.filter(f => f.type.startsWith('audio/')).length;

  const handleUploadSuccess = () => {
    setIsUploadOpen(false);
    refreshData();
  };
  
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <FileImage className="h-5 w-5 text-green-500" />;
    } else if (type.startsWith('video/')) {
      return <FileVideo className="h-5 w-5 text-red-500" />;
    } else if (type.startsWith('audio/')) {
      return <FileAudio className="h-5 w-5 text-purple-500" />;
    } else {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-8">
        {/* Header and Search */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Overview</h1>
          <div className="flex items-center space-x-3">
            <div className="relative w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Type your keyword, file format..." 
                className="pl-8" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <UploadArea onUploadSuccess={handleUploadSuccess} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* File Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="overflow-hidden bg-purple-50">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">All Audios</h3>
                  <p className="text-sm text-muted-foreground">{audioCount} files</p>
                </div>
                <Button variant="ghost" size="icon" className="text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden bg-green-50">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">All Images</h3>
                  <p className="text-sm text-muted-foreground">{imageCount} files</p>
                </div>
                <Button variant="ghost" size="icon" className="text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden bg-red-50">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">All Videos</h3>
                  <p className="text-sm text-muted-foreground">{videoCount} files</p>
                </div>
                <Button variant="ghost" size="icon" className="text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Drives */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {drives.map((drive) => (
            <Card key={drive.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-md bg-${drive.color}-100 flex items-center justify-center`}>
                    <File className={`h-6 w-6 text-${drive.color}-500`} />
                  </div>
                  <div>
                    <h3 className="font-medium">{drive.name}</h3>
                    <p className="text-sm text-muted-foreground">{drive.size}</p>
                  </div>
                </div>
                <div className="mt-4 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-${drive.color}-500 rounded-full`}
                    style={{ width: `${drive.usedPercent}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Card className="overflow-hidden border-dashed">
            <CardContent className="p-6 flex flex-col items-center justify-center h-full">
              <Button variant="ghost" className="text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add New Drive
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Recent Uploads */}
        <div>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-semibold">Uploads</h2>
            <Button variant="link" className="text-blue-600">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Downloads</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.map((file) => (
                <TableRow key={file.id} className="hover:bg-gray-50">
                  <TableCell className="pr-0">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {getFileIcon(file.type)}
                      <span>{file.filename}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatBytes(file.size)}</TableCell>
                  <TableCell>{new Date(file.lastModified).toLocaleDateString()}</TableCell>
                  <TableCell className="text-center">
                    {Math.floor(Math.random() * 500)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default MyFiles;
