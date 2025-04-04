
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
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const fetchArticles = async (): Promise<Article[]> => {
  const response = await fetch(
    "https://droidtechknow.com/api/dashboard_fetch_all_results.php"
  );
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

const Articles = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<keyof Article>("articleDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const {
    data: articles,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["articles"],
    queryFn: fetchArticles,
  });

  // Filter articles based on search term
  const filteredArticles = articles
    ? articles.filter((article) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          article.articleTitle.toLowerCase().includes(searchLower) ||
          article.author.toLowerCase().includes(searchLower) ||
          article.catagory.toLowerCase().includes(searchLower) ||
          article.articleDescription.toLowerCase().includes(searchLower)
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
    // In a real application, you would open an edit form/modal
    toast.info("Edit functionality would open a form with the article data");
  };

  const handleDelete = (article: Article) => {
    setSelectedArticle(article);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedArticle) {
      // In a real application, you would call an API to delete the article
      toast.success(`Article "${selectedArticle.articleTitle}" deleted successfully!`);
      setDeleteDialogOpen(false);
    }
  };

  // Stats calculations
  const totalArticles = articles?.length || 0;
  const totalViews = articles
    ? articles.reduce((sum, article) => sum + parseInt(article.views || "0"), 0)
    : 0;
  const totalLikes = articles
    ? articles.reduce((sum, article) => sum + parseInt(article.likes || "0"), 0)
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
    <div className="dashboard-container">
      <h1 className="text-2xl font-bold mb-6">Articles Management</h1>

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
            <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLikes.toLocaleString()}</div>
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
        </div>
      </div>

      {/* Articles Table */}
      <div className="table-container mb-4">
        <Table>
          <TableHeader>
            <TableRow>
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
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => handleSort("likes")}
              >
                Likes {sortField === "likes" && (sortDirection === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedArticles.length > 0 ? (
              paginatedArticles.map((article, index) => (
                <TableRow key={`${article.articleLink}-${index}`}>
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
                    {parseInt(article.likes).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
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
          <div className="py-4">
            <p>
              Are you sure you want to delete the article:{" "}
              <strong>
                {selectedArticle?.articleTitle}
              </strong>
              ?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Articles;
