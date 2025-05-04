
import React from "react";
import { FileImage, FileVideo, FileAudio, FileText, File } from "lucide-react";

export const getFileType = (file: File): string => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('application/pdf')) return 'pdf';
  if (file.type.startsWith('application/msword') || 
      file.type.startsWith('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
    return 'doc';
  }
  if (file.type.startsWith('application/vnd.ms-excel') || 
      file.type.startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
    return 'excel';
  }
  if (file.type.startsWith('application/vnd.ms-powerpoint') || 
      file.type.startsWith('application/vnd.openxmlformats-officedocument.presentationml.presentation')) {
    return 'powerpoint';
  }
  if (file.type.startsWith('text/')) return 'text';
  return 'other';
};

export const getFileIcon = (file: File) => {
  const type = getFileType(file);
  
  switch(type) {
    case 'image':
      if (file.type.startsWith('image/')) {
        try {
          const objectUrl = URL.createObjectURL(file);
          return <img src={objectUrl} alt={file.name} className="h-full w-full object-cover" onLoad={() => URL.revokeObjectURL(objectUrl)} />;
        } catch (err) {
          return <FileImage className="h-8 w-8 text-blue-500" />;
        }
      }
      return <FileImage className="h-8 w-8 text-blue-500" />;
    case 'video':
      return <FileVideo className="h-8 w-8 text-red-500" />;
    case 'audio':
      return <FileAudio className="h-8 w-8 text-yellow-500" />;
    case 'pdf':
      return <FileText className="h-8 w-8 text-red-500" />;
    case 'doc':
      return <FileText className="h-8 w-8 text-blue-500" />;
    case 'excel':
      return <FileText className="h-8 w-8 text-green-500" />;
    case 'powerpoint':
      return <FileText className="h-8 w-8 text-orange-500" />;
    case 'text':
      return <FileText className="h-8 w-8 text-gray-500" />;
    default:
      return <File className="h-8 w-8 text-gray-500" />;
  }
};

export const getFileTypeLabel = (type: string): string => {
  switch(type) {
    case 'image': return 'Image';
    case 'video': return 'Video';
    case 'audio': return 'Audio';
    case 'pdf': return 'PDF';
    case 'doc': return 'Document';
    case 'excel': return 'Spreadsheet';
    case 'powerpoint': return 'Presentation';
    case 'text': return 'Text';
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
