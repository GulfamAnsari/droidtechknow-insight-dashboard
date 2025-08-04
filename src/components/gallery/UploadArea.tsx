import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Image as ImageIcon, Trash } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useDropzone } from "react-dropzone";
import Cookies from "js-cookie";
import httpClient from "@/utils/httpClient";

interface UploadAreaProps {
  onUploadSuccess: () => void;
  userId?: string;
  album?: string;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onUploadSuccess, userId, album }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov', '.avi'],
      'audio/*': ['.mp3', '.wav', '.ogg', '.aac'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc', '.docx'],
      'application/vnd.ms-excel': ['.xls', '.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt', '.pptx'],
      'text/plain': ['.txt']
    },
    multiple: true
  });
  
  const getImageMetadata = async (file: File) => {
    return new Promise<Record<string, any>>((resolve) => {
      // Extract basic metadata from the File object
      const metadata: Record<string, any> = {
        format: file.type,
        extension: file.name.split('.').pop()?.toLowerCase(),
        size: file.size,
      };
      
      // For image files, extract dimensions
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = document.createElement('img');
          img.onload = () => {
            // Add dimensions
            metadata.width = img.width;
            metadata.height = img.height;
            
            resolve(metadata);
          };
          
          img.onerror = () => {
            // If we can't load the image, just return basic metadata
            resolve(metadata);
          };
          
          img.src = e.target?.result as string;
        };
        
        reader.onerror = () => resolve(metadata);
        reader.readAsDataURL(file);
      } else {
        resolve(metadata);
      }
    });
  };
  
  const uploadFiles = async () => {
    // Check if no files are selected
    if (files.length === 0) {
      toast.error("Please select at least one file to upload");
      return;
    }

    setUploading(true);
    setProgress(0); // Reset progress
    
    const totalFiles = files.length;
    let successCount = 0;
    let errorCount = 0;

    // Get userId from props or from cookie
    const userIdToUse = userId || Cookies.get('userId') || '';

    // Loop through files and upload each one
    for (let i = 0; i < totalFiles; i++) {
      try {
        const file = files[i];
        
        // Get metadata for the file
        const metadata = await getImageMetadata(file);

        // Determine file type for API
        let fileType = 'unknown';
        if (file.type.startsWith('image/')) {
          fileType = 'photo';
        } else if (file.type.startsWith('video/')) {
          fileType = 'video';
        } else if (file.type.startsWith('audio/')) {
          fileType = 'audio';
        } else if (file.type.startsWith('application/') || file.type.startsWith('text/')) {
          fileType = 'document';
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);
        formData.append('size', String(file.size));
        formData.append('type', file.type);
        formData.append('lastModified', String(file.lastModified));
        
        // Add width and height for images
        if (metadata.width) formData.append('width', String(metadata.width));
        if (metadata.height) formData.append('height', String(metadata.height));
        
        // Add fileType for API
        formData.append('fileType', fileType);
        
        // Always include userId
        formData.append('userId', userIdToUse);
        
        // Add album if provided
        if (album) {
          formData.append('album', album);
        }
        
        // Upload using our HTTP client
        await httpClient.post('https://droidtechknow.com/admin/api/files/upload.php', formData);
        
        successCount++;
      } catch (error) {
        console.error("Upload error:", error);
        errorCount++;
      }

      // Update the progress after each file upload
      setProgress(Math.round(((i + 1) / totalFiles) * 100));
    }

    // Reset the uploading state and clear the selected files
    setUploading(false);
    setFiles([]);

    // Show success or failure message depending on results
    if (errorCount > 0) {
      toast.warning(`Uploaded ${successCount} files, but ${errorCount} failed`);
    } else {
      toast.success(`Successfully uploaded ${successCount} files`);
    }

    // Trigger any callback on success
    onUploadSuccess();
  };
  
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-semibold">Upload Files</h2>
      
      <Card className={`border-2 border-dashed p-6 ${isDragActive ? 'border-primary' : 'border-muted'}`}>
        <div 
          {...getRootProps()}
          className="h-40 flex flex-col items-center justify-center cursor-pointer"
        >
          <input {...getInputProps()} />
          <Upload size={40} className={isDragActive ? "text-primary" : "text-muted-foreground"} />
          <p className="mt-4 text-center">
            {isDragActive 
              ? "Drop your files here..." 
              : "Drag and drop files here or click to select"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Supports: Images, Videos, Audio, Documents & more
          </p>
        </div>
      </Card>
      
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Selected Files ({files.length})</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFiles([])}
                disabled={uploading}
              >
                Clear All
              </Button>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-muted rounded overflow-hidden flex items-center justify-center">
                      {file.type.startsWith('image/') ? (
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={file.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon size={24} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="truncate max-w-[200px]">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                  >
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="mt-4">
              <Button 
                onClick={uploadFiles} 
                disabled={uploading || files.length === 0} 
                className="w-full"
              >
                {uploading ? "Uploading..." : `Upload ${files.length} ${files.length === 1 ? 'File' : 'Files'}`}
              </Button>
            </div>
            
            {uploading && (
              <div className="mt-4 space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center">{progress}% Complete</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UploadArea;
