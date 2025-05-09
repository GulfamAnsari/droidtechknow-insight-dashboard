import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  Eye,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDashboard } from "@/components/layout/DashboardLayout";
import httpClient from "@/utils/httpClient";

interface Article {
  articleDate: string;
  articleDescription: string;
  articleLink: string;
  articleTitle: string;
  author: string;
  catagory: string;
  comments: string | null;
  dislikes: string;
  imageAlt: string;
  imageLink: string;
  imageLink2: string;
  keywords: string;
  likes: string;
  post: string;
  subCatagory: string;
  views: string;
}

interface DeletePayload {
  password: string;
  post: string;
}

interface EditPayload {
  password: string;
  article: Partial<Article>;
}

const fetchArticles = async (): Promise<Article[]> => {
  const response = await httpClient.get(
    "https://droidtechknow.com/api/dashboard_fetch_all_results.php"
  );
  return response;
};

const deleteArticle = async (payload: DeletePayload): Promise<any> => {
  const response = await httpClient.post(
    "https://droidtechknow.com/admin/api/deleteArticle.php",
    payload
  );
  return response;
};

const editArticle = async (payload: EditPayload): Promise<any> => {
  const response = await httpClient.post(
    "https://droidtechknow.com/admin/api/editArticle.php",
    payload
  );
  return response;
};

const Articles = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<keyof Article>("articleDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedArticle, setEditedArticle] = useState<Partial<Article>>({});
  const { refreshData, isRefreshing } = useDashboard();

  const {
    data: articles,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["articles"],
    queryFn: fetchArticles,
  });

  // Initialize edited article when a article is selected for editing
  useEffect(() => {
    if (selectedArticle && editDialogOpen) {
      setEditedArticle({ ...selectedArticle });
    }
  }, [selectedArticle, editDialogOpen]);

  // Listen for dashboard refresh signal
  useEffect(() => {
    if (isRefreshing) {
      refetch();
    }
  }, [isRefreshing, refetch]);

  // Filter articles based on search term
  const filteredArticles = articles
    ? articles.filter((article) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          article.articleTitle.toLowerCase().includes(searchLower) ||
          article.author.toLowerCase().includes(searchLower) ||
          article.catagory.toLowerCase().includes(searchLower) ||
          article.articleDescription.toLowerCase().includes(searchLower) ||
          article.post.toLowerCase().includes(searchLower)
        );
      })
    : [];

  // Sort articles
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (sortField === "views" || sortField === "likes" || sortField === "dislikes") {
      return sortDirection === "asc"
        ? parseInt(aValue as string) - parseInt(bValue as string)
        : parseInt(bValue as string) - parseInt(aValue as string);
    }

    if (sortDirection === "asc") {
      return (aValue || "").toString().localeCompare((bValue || "").toString());
    } else {
      return (bValue || "").toString().localeCompare((aValue || "").toString());
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedArticles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedArticles = sortedArticles.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSort = (field: keyof Article) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleEdit = (article: Article) => {
    setSelectedArticle(article);
    setEditDialogOpen(true);
  };

  const handleDelete = (article: Article) => {
    setSelectedArticle(article);
    setDeleteDialogOpen(true);
  };

  const handleView = (article: Article) => {
    setSelectedArticle(article);
    setViewDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedArticle || !password) return;
    
    setIsSubmitting(true);
    
    try {
      await deleteArticle({
        password: password,
        post: selectedArticle.post
      });
      
      toast.success(`Article "${selectedArticle.articleTitle}" deleted successfully!`);
      setDeleteDialogOpen(false);
      setPassword("");
      refetch(); // Refresh the articles list
    } catch (err) {
      toast.error(`Failed to delete article: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmEdit = async () => {
    if (!selectedArticle || !password || !editedArticle) return;
    
    setIsSubmitting(true);
    
    try {
      // Make sure post ID is included
      const articleWithId = {
        ...editedArticle,
        post: selectedArticle.post
      };
      
      await editArticle({
        password: password,
        article: articleWithId
      });
      
      toast.success(`Article "${editedArticle.articleTitle}" updated successfully!`);
      setEditDialogOpen(false);
      setPassword("");
      setEditedArticle({});
      refetch(); // Refresh the articles list
    } catch (err) {
      toast.error(`Failed to update article: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedArticle(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setEditedArticle(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Stats calculations
  const totalArticles = articles?.length || 0;
  const totalViews = articles
    ? articles.reduce((sum, article) => sum + parseInt(article.views || "0"), 0)
    : 0;
  const totalDislikes = articles
    ? articles.reduce((sum, article) => sum + parseInt(article.dislikes || "0"), 0)
    : 0;

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-500">Loading articles...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="dashboard-container">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p>Error loading articles: {(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container inner-container">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalArticles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Dislikes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDislikes.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search articles..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(parseInt(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="10 per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 per page</SelectItem>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Articles Table */}
      <div className="table-container mb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="w-12 cursor-pointer"
                onClick={() => handleSort("post")}
              >
                ID {sortField === "post" && (sortDirection === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="w-12 cursor-pointer"
                onClick={() => handleSort("articleTitle")}
              >
                Title {sortField === "articleTitle" && (sortDirection === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("author")}
              >
                Author {sortField === "author" && (sortDirection === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("catagory")}
              >
                Category {sortField === "catagory" && (sortDirection === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("articleDate")}
              >
                Date {sortField === "articleDate" && (sortDirection === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => handleSort("views")}
              >
                Views {sortField === "views" && (sortDirection === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedArticles.length > 0 ? (
              paginatedArticles.map((article, index) => (
                <TableRow key={`${article.articleLink}-${index}`}>
                  <TableCell className="font-medium">
                    {article.post}
                  </TableCell>
                  <TableCell className="font-medium max-w-xs truncate">
                    {article.articleTitle}
                  </TableCell>
                  <TableCell>{article.author}</TableCell>
                  <TableCell className="capitalize">
                    {article.catagory}
                  </TableCell>
                  <TableCell>{article.articleDate}</TableCell>
                  <TableCell className="text-right">
                    {parseInt(article.views).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleView(article)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(article)}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(article)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center"
                >
                  No articles found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + itemsPerPage, filteredArticles.length)} of{" "}
            {filteredArticles.length} articles
          </div>
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
              <span className="sr-only">First page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((page) => page - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <div className="flex items-center text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((page) => page + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
              <span className="sr-only">Last page</span>
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p>
              Are you sure you want to delete the article:{" "}
              <strong>
                {selectedArticle?.articleTitle}
              </strong>
              ?
            </p>
            <p className="text-sm text-gray-500">
              This action cannot be undone.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="delete-password">Enter Password</Label>
              <Input 
                id="delete-password" 
                type="password" 
                placeholder="Enter password to confirm" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setPassword("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={!password || isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Article Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Article</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="articleTitle">Title</Label>
                <Input 
                  id="articleTitle" 
                  name="articleTitle"
                  value={editedArticle.articleTitle || ""}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input 
                  id="author" 
                  name="author"
                  value={editedArticle.author || ""}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="catagory">Category</Label>
                <Input 
                  id="catagory" 
                  name="catagory"
                  value={editedArticle.catagory || ""}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subCatagory">Subcategory</Label>
                <Input 
                  id="subCatagory" 
                  name="subCatagory"
                  value={editedArticle.subCatagory || ""}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="articleDate">Date</Label>
                <Input 
                  id="articleDate" 
                  name="articleDate"
                  value={editedArticle.articleDate || ""}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <Input 
                  id="keywords" 
                  name="keywords"
                  value={editedArticle.keywords || ""}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="imageLink">Image Link 1</Label>
                <Input 
                  id="imageLink" 
                  name="imageLink"
                  value={editedArticle.imageLink || ""}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageLink2">Image Link 2</Label>
                <Input 
                  id="imageLink2" 
                  name="imageLink2"
                  value={editedArticle.imageLink2 || ""}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="imageAlt">Image Alt</Label>
                <Input 
                  id="imageAlt" 
                  name="imageAlt"
                  value={editedArticle.imageAlt || ""}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="articleDescription">Description</Label>
              <Textarea 
                id="articleDescription" 
                name="articleDescription"
                rows={3}
                value={editedArticle.articleDescription || ""}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-password">Enter Password</Label>
              <Input 
                id="edit-password" 
                type="password" 
                placeholder="Enter password to save changes" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setPassword("");
                setEditedArticle({});
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={confirmEdit}
              disabled={!password || isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Article Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Article Details</DialogTitle>
          </DialogHeader>
          {selectedArticle && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-gray-500">ID</h3>
                  <p>{selectedArticle.post}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-500">Title</h3>
                  <p>{selectedArticle.articleTitle}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-500">Author</h3>
                  <p>{selectedArticle.author}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-500">Category</h3>
                  <p>{selectedArticle.catagory}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-500">Subcategory</h3>
                  <p>{selectedArticle.subCatagory}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-500">Date</h3>
                  <p>{selectedArticle.articleDate}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-500">Link</h3>
                  <p className="break-all">{selectedArticle.articleLink}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-500">Views</h3>
                  <p>{selectedArticle.views}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-500">Likes</h3>
                  <p>{selectedArticle.likes}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-500">Dislikes</h3>
                  <p>{selectedArticle.dislikes}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-500">Keywords</h3>
                  <p>{selectedArticle.keywords}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-sm text-gray-500">Description</h3>
                <p className="whitespace-pre-wrap">{selectedArticle.articleDescription}</p>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-gray-500">Image alt</h3>
                <p className="whitespace-pre-wrap">{selectedArticle.imageAlt}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-sm text-gray-500">ImageLink</h3>
                {selectedArticle.imageLink ? (
                  <div className="mt-2">
                    <img 
                      src={'https://droidtechknow.com' + selectedArticle.imageLink} 
                      alt={selectedArticle.imageAlt} 
                      className="max-h-48 object-contain border border-gray-200 rounded"
                    />
                    <p className="mt-1 text-sm text-gray-500">{selectedArticle.imageAlt}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">No image available</p>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-500">ImageLink2</h3>
                {selectedArticle.imageLink2 ? (
                  <div className="mt-2">
                    <img 
                      src={'https://droidtechknow.com' + selectedArticle.imageLink2} 
                      alt={selectedArticle.imageAlt} 
                      className="max-h-48 object-contain border border-gray-200 rounded"
                    />
                    <p className="mt-1 text-sm text-gray-500">{selectedArticle.imageLink2}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">No image available</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="default"
              onClick={() => setViewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Articles;
