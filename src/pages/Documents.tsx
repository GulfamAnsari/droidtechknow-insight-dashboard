
import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Grid3X3, LayoutGrid, File, FileText, Upload, FolderPlus } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import DocumentUploadArea from "@/components/documents/DocumentUploadArea";
import { useDashboard } from "@/components/layout/DashboardLayout";

interface Document {
  id: string;
  filename: string;
  type: string;
  size: number;
  lastModified: string;
  url: string;
}

const Documents = () => {
  const { refreshData } = useDashboard();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Sample document data for demonstration
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "1",
      filename: "Project Report.pdf",
      type: "pdf",
      size: 2.4 * 1024 * 1024,
      lastModified: "2023-05-12T10:30:00Z",
      url: "#"
    },
    {
      id: "2",
      filename: "Financial Statement.xlsx",
      type: "xlsx",
      size: 1.2 * 1024 * 1024,
      lastModified: "2023-06-01T13:45:00Z",
      url: "#"
    },
    {
      id: "3",
      filename: "Meeting Notes.docx",
      type: "docx",
      size: 0.8 * 1024 * 1024,
      lastModified: "2023-05-20T09:15:00Z",
      url: "#"
    }
  ]);
  
  // Filter documents by search query
  const filteredDocuments = documents.filter(doc => 
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Define document categories
  const categories = [
    { id: 'all', name: 'All Documents', count: filteredDocuments.length },
    { id: 'pdf', name: 'PDF Files', count: filteredDocuments.filter(d => d.type === 'pdf').length },
    { id: 'word', name: 'Word Documents', count: filteredDocuments.filter(d => d.type === 'docx').length },
    { id: 'excel', name: 'Excel Files', count: filteredDocuments.filter(d => d.type === 'xlsx').length },
  ];
  
  // Get documents for the selected category
  let displayDocuments = filteredDocuments;
  if (selectedCategory && selectedCategory !== 'all') {
    displayDocuments = filteredDocuments.filter(d => d.type === selectedCategory);
  }

  const handleUploadSuccess = (newDocs: Document[]) => {
    setDocuments(prevDocs => [...newDocs, ...prevDocs]);
    setIsUploadOpen(false);
    refreshData();
  };
  
  const getDocumentIcon = (type: string) => {
    switch(type) {
      case 'pdf':
        return <File className="h-10 w-10 text-red-500" />;
      case 'docx':
        return <FileText className="h-10 w-10 text-blue-500" />;
      case 'xlsx':
        return <File className="h-10 w-10 text-green-500" />;
      default:
        return <File className="h-10 w-10 text-gray-500" />;
    }
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-muted/30 border-r flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Documents</h2>
          <p className="text-xs text-muted-foreground">Upload and manage documents</p>
        </div>
        
        <div className="flex-1 overflow-auto">
          <div className="pt-4 px-2">
            <div className="mb-4">
              <div className="flex items-center px-3 mb-2">
                <h3 className="font-medium text-sm">Categories</h3>
              </div>
              <ul className="space-y-1">
                {categories.map((category) => (
                  <li key={category.id}>
                    <button
                      onClick={() => setSelectedCategory(category.id === 'all' ? null : category.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-md flex items-center justify-between text-sm ${
                        (category.id === 'all' && !selectedCategory) || selectedCategory === category.id 
                          ? 'bg-accent text-accent-foreground' 
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <span>{category.name}</span>
                      <Badge variant="gray">{category.count}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between px-3 mb-2">
                <h3 className="font-medium text-sm">Folders</h3>
                <button className="text-xs text-primary hover:underline">
                  <FolderPlus className="h-3 w-3" />
                </button>
              </div>
              <ul className="space-y-1">
                <li className="px-3 py-2 text-xs text-muted-foreground">No folders created</li>
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
                placeholder="Search documents..." 
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
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DocumentUploadArea onUploadSuccess={handleUploadSuccess} />
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-auto p-6">
          {displayDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-muted-foreground mb-4">No documents found</p>
              <Button onClick={() => setIsUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload your first document
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {displayDocuments.map((doc) => (
                <Card key={doc.id} className="overflow-hidden group">
                  <CardContent className="p-4 flex flex-col items-center">
                    {getDocumentIcon(doc.type)}
                    <div className="mt-2 text-center">
                      <p className="text-sm font-medium truncate max-w-full">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {(doc.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-sm p-2">Name</th>
                    <th className="text-left font-medium text-sm p-2">Type</th>
                    <th className="text-left font-medium text-sm p-2">Size</th>
                    <th className="text-left font-medium text-sm p-2">Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {displayDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/50">
                      <td className="p-2">
                        <div className="flex items-center space-x-3">
                          {getDocumentIcon(doc.type)}
                          <span className="text-sm">{doc.filename}</span>
                        </div>
                      </td>
                      <td className="p-2 text-sm uppercase">
                        {doc.type}
                      </td>
                      <td className="p-2 text-sm">
                        {(doc.size / (1024 * 1024)).toFixed(2)} MB
                      </td>
                      <td className="p-2 text-sm">
                        {new Date(doc.lastModified).toLocaleDateString()}
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

export default Documents;
