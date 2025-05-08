
import React from "react";
import { FileImage, FileVideo, FileAudio, FileText, File, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const getFileType = (filename: string, mimeType: string): string => {
  // First, try to determine by mime type if provided
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'photo';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'document';
    if (mimeType.startsWith('application/msword') || 
        mimeType.startsWith('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      return 'document';
    }
    if (mimeType.startsWith('application/vnd.ms-excel') || 
        mimeType.startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      return 'document';
    }
    if (mimeType.startsWith('application/vnd.ms-powerpoint') || 
        mimeType.startsWith('application/vnd.openxmlformats-officedocument.presentationml.presentation')) {
      return 'document';
    }
    if (mimeType.startsWith('text/')) return 'document';
  }
  
  // Fallback to extension-based detection
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension) {
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) return 'photo';
    if (['mp4', 'webm', 'mov', 'avi', 'wmv', 'flv', 'mkv'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'].includes(extension)) return 'audio';
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'].includes(extension)) return 'document';
  }
  
  return 'other'; // Changed from 'unknown' to 'other'
};

export const getFileIcon = (fileType: string, mimeType: string) => {
  switch(fileType) {
    case 'photo':
      return <FileImage className="h-8 w-8 text-blue-500" />;
    case 'video':
      return <FileVideo className="h-8 w-8 text-red-500" />;
    case 'audio':
      return <FileAudio className="h-8 w-8 text-yellow-500" />;
    case 'document':
      if (mimeType && mimeType.includes('pdf')) {
        return <FileText className="h-8 w-8 text-red-500" />;
      } else if (mimeType && (mimeType.includes('word') || mimeType.includes('document'))) {
        return <FileText className="h-8 w-8 text-blue-500" />;
      } else if (mimeType && (mimeType.includes('sheet') || mimeType.includes('excel'))) {
        return <FileText className="h-8 w-8 text-green-500" />;
      } else if (mimeType && (mimeType.includes('presentation') || mimeType.includes('powerpoint'))) {
        return <FileText className="h-8 w-8 text-orange-500" />;
      } else {
        return <FileText className="h-8 w-8 text-gray-500" />;
      }
    default:
      return <File className="h-8 w-8 text-gray-500" />;
  }
};

export const getFileTypeLabel = (type: string): string => {
  switch(type) {
    case 'photo': return 'Image';
    case 'video': return 'Video';
    case 'audio': return 'Audio';
    case 'document': return 'Document';
    case 'other': return 'Other';
    default: return 'Other';
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (timestamp: string): string => {
  // Ensure timestamp is treated as a number for date creation
  const date = new Date(parseInt(timestamp));
  
  // Check if the date is valid (not 1970-01-01)
  if (date.getFullYear() === 1970 && date.getMonth() === 0 && date.getDate() === 1) {
    return "Unknown Date";
  }
  
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  });
};

export const groupFilesByDate = (files: any[]): { [date: string]: any[] } => {
  return files.reduce((groups: { [date: string]: any[] }, file) => {
    // Convert lastModified from epoch string to date string for grouping
    const dateObj = new Date(parseInt(file.lastModified));
    
    // Format date as YYYY-MM-DD for grouping
    // Check if date is valid (not 1970-01-01)
    let dateKey;
    
    if (dateObj.getFullYear() === 1970 && dateObj.getMonth() === 0 && dateObj.getDate() === 1) {
      // Use createdAt as fallback if available, otherwise use current date
      if (file.createdAt) {
        const createdDate = new Date(file.createdAt);
        dateKey = createdDate.toISOString().split('T')[0];
      } else {
        dateKey = new Date().toISOString().split('T')[0];
      }
    } else {
      dateKey = dateObj.toISOString().split('T')[0];
    }
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    
    groups[dateKey].push(file);
    return groups;
  }, {});
};

export const downloadFile = (file: any) => {
  try {
    const link = document.createElement('a');
    link.href = file.url.startsWith('http') ? file.url : `https://droidtechknow.com/admin/api/files/${file.url}`;
    link.download = file.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error downloading file:", error);
  }
};

export const DownloadButton = ({ file, className = "" }: { file: any; className?: string }) => {
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        downloadFile(file);
      }} 
      title="Download file"
    >
      <Download className="h-4 w-4" />
    </Button>
  );
};
