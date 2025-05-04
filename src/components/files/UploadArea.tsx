
import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Trash } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useDropzone } from "react-dropzone";
import { getFileIcon } from "@/components/files/FileUtils";

interface UploadAreaProps {
  onUploadSuccess: () => void;
  acceptedFileTypes?: string[];
  title?: string;
}

const UploadArea: React.FC<UploadAreaProps> = ({ 
  onUploadSuccess, 
  acceptedFileTypes = ["image/*", "application/pdf", "video/*", "audio/*"], 
  title = "Upload Files" 
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);
  
  const getAcceptMap = () => {
    const acceptMap: Record<string, string[]> = {};
    acceptedFileTypes.forEach(type => {
      if (type === "image/*") {
        acceptMap["image/*"] = ['.jpeg', '.jpg', '.png', '.gif', '.webp'];
      } else if (type === "video/*") {
        acceptMap["video/*"] = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
      } else if (type === "audio/*") {
        acceptMap["audio/*"] = ['.mp3', '.wav', '.ogg', '.flac'];
      } else if (type === "application/pdf") {
        acceptMap["application/pdf"] = ['.pdf'];
      } else if (type === "application/msword" || type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        acceptMap[type] = ['.doc', '.docx'];
      } else if (type === "application/vnd.ms-excel" || type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        acceptMap[type] = ['.xls', '.xlsx'];
      } else if (type === "text/plain") {
        acceptMap["text/plain"] = ['.txt'];
      } else if (type === "application/vnd.ms-powerpoint" || type === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
        acceptMap[type] = ['.ppt', '.pptx'];
      }
    });
    return acceptMap;
  };
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getAcceptMap(),
    multiple: true
  });
  
  const getImageDimensions = async (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve({ width: 0, height: 0 });
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      
      img.src = URL.createObjectURL(file);
    });
  };
  
  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file to upload");
      return;
    }
    
    setUploading(true);
    setProgress(0);
    
    const totalFiles = files.length;
    let successCount = 0;
    let errorCount = 0;
    
    // Loop through files and make individual API calls
    for (let i = 0; i < totalFiles; i++) {
      try {
        const file = files[i];
        const { width, height } = await getImageDimensions(file);
        
        const formData = new FormData();
        formData.append('photo0', file);
        formData.append('title', file.name);
        formData.append('size', String(file.size));
        formData.append('type', file.type);
        formData.append('lastModified', String(file.lastModified));
        
        // Only add width and height for image files
        if (file.type.startsWith('image/')) {
          formData.append('width', String(width));
          formData.append('height', String(height));
        }
        
        const response = await fetch('https://droidtechknow.com/admin/upload.php', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        
        successCount++;
      } catch (error) {
        console.error("Upload error:", error);
        errorCount++;
      }
      
      // Update progress
      setProgress(Math.round(((i + 1) / totalFiles) * 100));
    }
    
    setUploading(false);
    setFiles([]);
    
    if (errorCount > 0) {
      toast.warning(`Uploaded ${successCount} files, but ${errorCount} failed`);
    } else {
      toast.success(`Successfully uploaded ${successCount} files`);
    }
    
    onUploadSuccess();
  };
  
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      
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
            Supports: Images, Videos, Documents, Audio files
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
                      {getFileIcon(file)}
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
