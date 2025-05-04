
import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, File, Trash } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useDropzone } from "react-dropzone";

interface Document {
  id: string;
  filename: string;
  type: string;
  size: number;
  lastModified: string;
  url: string;
}

interface DocumentUploadAreaProps {
  onUploadSuccess: (documents: Document[]) => void;
}

const DocumentUploadArea: React.FC<DocumentUploadAreaProps> = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
    },
    multiple: true
  });
  
  const getFileType = (file: File): string => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    return extension;
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
    const uploadedDocs: Document[] = [];
    
    // Loop through files and make individual API calls
    for (let i = 0; i < totalFiles; i++) {
      try {
        const file = files[i];
        // In a real implementation, you would upload to a server
        // For now, we'll simulate a successful upload
        
        // Create a document object
        const doc: Document = {
          id: `doc-${Date.now()}-${i}`,
          filename: file.name,
          type: getFileType(file),
          size: file.size,
          lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString(),
          url: URL.createObjectURL(file) // In a real app, this would be the URL from the server
        };
        
        uploadedDocs.push(doc);
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
      toast.warning(`Uploaded ${successCount} documents, but ${errorCount} failed`);
    } else {
      toast.success(`Successfully uploaded ${successCount} documents`);
    }
    
    onUploadSuccess(uploadedDocs);
  };
  
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  const getFileIcon = (file: File) => {
    const type = getFileType(file);
    
    switch(type) {
      case 'pdf':
        return <File className="h-8 w-8 text-red-500" />;
      case 'doc':
      case 'docx':
        return <File className="h-8 w-8 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <File className="h-8 w-8 text-green-500" />;
      case 'ppt':
      case 'pptx':
        return <File className="h-8 w-8 text-orange-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };
  
  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-semibold">Upload Documents</h2>
      
      <Card className={`border-2 border-dashed p-6 ${isDragActive ? 'border-primary' : 'border-muted'}`}>
        <div 
          {...getRootProps()}
          className="h-40 flex flex-col items-center justify-center cursor-pointer"
        >
          <input {...getInputProps()} />
          <Upload size={40} className={isDragActive ? "text-primary" : "text-muted-foreground"} />
          <p className="mt-4 text-center">
            {isDragActive 
              ? "Drop your documents here..." 
              : "Drag and drop documents here or click to select"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Supports: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
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
                    <div className="flex items-center justify-center">
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
                {uploading ? "Uploading..." : `Upload ${files.length} ${files.length === 1 ? 'Document' : 'Documents'}`}
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

export default DocumentUploadArea;
