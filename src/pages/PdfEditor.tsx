import { useState, useRef, useEffect, useCallback } from "react";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Upload,
  Download,
  RotateCw,
  RotateCcw,
  Trash2,
  Plus,
  Type,
  Highlighter,
  PenTool,
  Square,
  Circle,
  ArrowUp,
  ArrowDown,
  Copy,
  Scissors,
  FileUp,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Image as ImageIcon,
  Eraser,
  Move,
  Save,
  Eye,
  Layers,
  ChevronLeft,
  ChevronRight,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PageData {
  pageNumber: number;
  rotation: number;
  deleted: boolean;
}

interface Annotation {
  id: string;
  type: "text" | "highlight" | "draw" | "rectangle" | "circle" | "image";
  pageNumber: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color: string;
  fontSize?: number;
  paths?: { x: number; y: number }[];
  imageData?: string;
}

interface HistoryState {
  pdfBytes: Uint8Array;
  pages: PageData[];
  annotations: Annotation[];
}

export default function PdfEditor() {
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>("select");
  const [selectedColor, setSelectedColor] = useState("#FF0000");
  const [fontSize, setFontSize] = useState(16);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [textInput, setTextInput] = useState("");
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [pageRenderings, setPageRenderings] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [draggedPage, setDraggedPage] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Render PDF page to canvas
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfBytes) return;

    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(pageNum);
      
      const scale = zoom / 100;
      const viewport = page.getViewport({ scale, rotation: pages[pageNum - 1]?.rotation || 0 });

      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Also resize annotation canvas
      if (annotationCanvasRef.current) {
        annotationCanvasRef.current.width = viewport.width;
        annotationCanvasRef.current.height = viewport.height;
      }

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Render annotations for this page
      renderAnnotations(pageNum);
    } catch (error) {
      console.error("Error rendering page:", error);
    }
  }, [pdfBytes, zoom, pages]);

  // Render annotations on the annotation canvas
  const renderAnnotations = useCallback((pageNum: number) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNum);
    const scale = zoom / 100;

    pageAnnotations.forEach((annotation) => {
      ctx.save();
      
      switch (annotation.type) {
        case "text":
          ctx.font = `${(annotation.fontSize || 16) * scale}px Arial`;
          ctx.fillStyle = annotation.color;
          ctx.fillText(annotation.content || "", annotation.x * scale, annotation.y * scale);
          break;

        case "highlight":
          ctx.fillStyle = annotation.color + "40";
          ctx.fillRect(
            annotation.x * scale,
            annotation.y * scale,
            (annotation.width || 100) * scale,
            (annotation.height || 20) * scale
          );
          break;

        case "draw":
          if (annotation.paths && annotation.paths.length > 1) {
            ctx.strokeStyle = annotation.color;
            ctx.lineWidth = 2 * scale;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(annotation.paths[0].x * scale, annotation.paths[0].y * scale);
            annotation.paths.forEach((point) => {
              ctx.lineTo(point.x * scale, point.y * scale);
            });
            ctx.stroke();
          }
          break;

        case "rectangle":
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = 2 * scale;
          ctx.strokeRect(
            annotation.x * scale,
            annotation.y * scale,
            (annotation.width || 100) * scale,
            (annotation.height || 50) * scale
          );
          break;

        case "circle":
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = 2 * scale;
          ctx.beginPath();
          ctx.ellipse(
            annotation.x * scale,
            annotation.y * scale,
            ((annotation.width || 50) / 2) * scale,
            ((annotation.height || 50) / 2) * scale,
            0,
            0,
            2 * Math.PI
          );
          ctx.stroke();
          break;

        case "image":
          if (annotation.imageData) {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(
                img,
                annotation.x * scale,
                annotation.y * scale,
                (annotation.width || 100) * scale,
                (annotation.height || 100) * scale
              );
            };
            img.src = annotation.imageData;
          }
          break;
      }

      ctx.restore();
    });
  }, [annotations, zoom]);

  // Generate page thumbnails
  const generateThumbnails = useCallback(async () => {
    if (!pdfBytes) return;

    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    const newRenderings = new Map<number, string>();

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const scale = 0.2;
      const viewport = page.getViewport({ scale, rotation: pages[i - 1]?.rotation || 0 });

      const canvas = document.createElement("canvas");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const context = canvas.getContext("2d");
      if (context) {
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        newRenderings.set(i, canvas.toDataURL());
      }
    }

    setPageRenderings(newRenderings);
  }, [pdfBytes, pages]);

  // Load PDF file
  const loadPdf = async (file: File) => {
    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const bytes = await pdfDoc.save();

      setPdfDoc(pdfDoc);
      setPdfBytes(bytes);
      
      const pageCount = pdfDoc.getPageCount();
      const pageData: PageData[] = Array.from({ length: pageCount }, (_, i) => ({
        pageNumber: i + 1,
        rotation: 0,
        deleted: false,
      }));
      
      setPages(pageData);
      setCurrentPage(1);
      setAnnotations([]);
      setHistory([]);
      setHistoryIndex(-1);
      
      toast.success(`Loaded PDF with ${pageCount} pages`);
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast.error("Failed to load PDF");
    } finally {
      setIsLoading(false);
    }
  };

  // Save current state to history
  const saveToHistory = useCallback(() => {
    if (!pdfBytes) return;

    const newState: HistoryState = {
      pdfBytes: new Uint8Array(pdfBytes),
      pages: [...pages],
      annotations: [...annotations],
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [pdfBytes, pages, annotations, history, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setPdfBytes(prevState.pdfBytes);
      setPages(prevState.pages);
      setAnnotations(prevState.annotations);
      setHistoryIndex(historyIndex - 1);
      toast("Undone");
    }
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setPdfBytes(nextState.pdfBytes);
      setPages(nextState.pages);
      setAnnotations(nextState.annotations);
      setHistoryIndex(historyIndex + 1);
      toast("Redone");
    }
  }, [history, historyIndex]);

  // Rotate page
  const rotatePage = async (pageNum: number, direction: "cw" | "ccw") => {
    if (!pdfDoc) return;
    saveToHistory();

    const page = pdfDoc.getPage(pageNum - 1);
    const currentRotation = page.getRotation().angle;
    const newRotation = direction === "cw" 
      ? (currentRotation + 90) % 360 
      : (currentRotation - 90 + 360) % 360;
    
    page.setRotation(degrees(newRotation));
    
    const newBytes = await pdfDoc.save();
    setPdfBytes(newBytes);
    
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNum ? { ...p, rotation: newRotation } : p
      )
    );
    
    toast.success(`Rotated page ${pageNum}`);
  };

  // Delete page
  const deletePage = async (pageNum: number) => {
    if (!pdfDoc || pdfDoc.getPageCount() <= 1) {
      toast.error("Cannot delete the last page");
      return;
    }
    saveToHistory();

    pdfDoc.removePage(pageNum - 1);
    const newBytes = await pdfDoc.save();
    setPdfBytes(newBytes);

    const newPages = pages
      .filter((p) => p.pageNumber !== pageNum)
      .map((p, i) => ({ ...p, pageNumber: i + 1 }));
    
    setPages(newPages);
    
    if (currentPage > newPages.length) {
      setCurrentPage(newPages.length);
    }
    
    // Remove annotations for deleted page
    setAnnotations((prev) =>
      prev
        .filter((a) => a.pageNumber !== pageNum)
        .map((a) => ({
          ...a,
          pageNumber: a.pageNumber > pageNum ? a.pageNumber - 1 : a.pageNumber,
        }))
    );
    
    toast.success(`Deleted page ${pageNum}`);
  };

  // Duplicate page
  const duplicatePage = async (pageNum: number) => {
    if (!pdfDoc) return;
    saveToHistory();

    const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [pageNum - 1]);
    pdfDoc.insertPage(pageNum, copiedPage);
    
    const newBytes = await pdfDoc.save();
    setPdfBytes(newBytes);

    const newPages = [...pages];
    newPages.splice(pageNum, 0, {
      pageNumber: pageNum + 1,
      rotation: pages[pageNum - 1].rotation,
      deleted: false,
    });
    
    // Update page numbers
    setPages(newPages.map((p, i) => ({ ...p, pageNumber: i + 1 })));
    
    toast.success(`Duplicated page ${pageNum}`);
  };

  // Move page
  const movePage = async (fromIndex: number, toIndex: number) => {
    if (!pdfDoc || fromIndex === toIndex) return;
    saveToHistory();

    const [movedPage] = await pdfDoc.copyPages(pdfDoc, [fromIndex]);
    pdfDoc.removePage(fromIndex);
    pdfDoc.insertPage(toIndex > fromIndex ? toIndex - 1 : toIndex, movedPage);
    
    const newBytes = await pdfDoc.save();
    setPdfBytes(newBytes);

    const newPages = [...pages];
    const [removed] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, removed);
    
    setPages(newPages.map((p, i) => ({ ...p, pageNumber: i + 1 })));
    
    toast.success("Page moved");
  };

  // Merge PDFs
  const mergePdf = async (file: File) => {
    if (!pdfDoc) return;
    saveToHistory();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const otherPdf = await PDFDocument.load(arrayBuffer);
      
      const copiedPages = await pdfDoc.copyPages(otherPdf, otherPdf.getPageIndices());
      copiedPages.forEach((page) => pdfDoc.addPage(page));
      
      const newBytes = await pdfDoc.save();
      setPdfBytes(newBytes);

      const newPageCount = pdfDoc.getPageCount();
      setPages(Array.from({ length: newPageCount }, (_, i) => ({
        pageNumber: i + 1,
        rotation: 0,
        deleted: false,
      })));
      
      toast.success(`Merged ${otherPdf.getPageCount()} pages`);
    } catch (error) {
      console.error("Error merging PDF:", error);
      toast.error("Failed to merge PDF");
    }
  };

  // Split PDF
  const splitPdf = async (startPage: number, endPage: number) => {
    if (!pdfDoc) return;

    try {
      const newPdf = await PDFDocument.create();
      const pageIndices = Array.from(
        { length: endPage - startPage + 1 },
        (_, i) => startPage - 1 + i
      );
      
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));
      
      const splitBytes = await newPdf.save();
      downloadPdf(splitBytes, `split_${startPage}-${endPage}.pdf`);
      
      toast.success(`Split pages ${startPage}-${endPage}`);
    } catch (error) {
      console.error("Error splitting PDF:", error);
      toast.error("Failed to split PDF");
    }
  };

  // Add text annotation
  const addTextAnnotation = (x: number, y: number) => {
    if (!textInput.trim()) {
      toast.error("Enter text first");
      return;
    }
    saveToHistory();

    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: "text",
      pageNumber: currentPage,
      x: x / (zoom / 100),
      y: y / (zoom / 100),
      content: textInput,
      color: selectedColor,
      fontSize: fontSize,
    };

    setAnnotations((prev) => [...prev, annotation]);
    setTextInput("");
    toast.success("Text added");
  };

  // Add image annotation
  const addImageAnnotation = async (file: File, x: number, y: number) => {
    saveToHistory();

    const reader = new FileReader();
    reader.onload = () => {
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        type: "image",
        pageNumber: currentPage,
        x: x / (zoom / 100),
        y: y / (zoom / 100),
        width: 100,
        height: 100,
        color: selectedColor,
        imageData: reader.result as string,
      };

      setAnnotations((prev) => [...prev, annotation]);
      toast.success("Image added");
    };
    reader.readAsDataURL(file);
  };

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    switch (selectedTool) {
      case "text":
        addTextAnnotation(x, y);
        break;
      case "highlight":
        saveToHistory();
        setAnnotations((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: "highlight",
            pageNumber: currentPage,
            x: x / (zoom / 100),
            y: y / (zoom / 100),
            width: 100,
            height: 20,
            color: selectedColor,
          },
        ]);
        break;
      case "rectangle":
        saveToHistory();
        setAnnotations((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: "rectangle",
            pageNumber: currentPage,
            x: x / (zoom / 100),
            y: y / (zoom / 100),
            width: 100,
            height: 50,
            color: selectedColor,
          },
        ]);
        break;
      case "circle":
        saveToHistory();
        setAnnotations((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: "circle",
            pageNumber: currentPage,
            x: x / (zoom / 100),
            y: y / (zoom / 100),
            width: 50,
            height: 50,
            color: selectedColor,
          },
        ]);
        break;
    }
  };

  // Handle drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedTool !== "draw") return;

    const canvas = annotationCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (zoom / 100);
    const y = (e.clientY - rect.top) / (zoom / 100);

    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || selectedTool !== "draw") return;

    const canvas = annotationCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (zoom / 100);
    const y = (e.clientY - rect.top) / (zoom / 100);

    setCurrentPath((prev) => [...prev, { x, y }]);

    // Draw in real-time
    const ctx = canvas.getContext("2d");
    if (ctx && currentPath.length > 0) {
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      const lastPoint = currentPath[currentPath.length - 1];
      ctx.moveTo(lastPoint.x * (zoom / 100), lastPoint.y * (zoom / 100));
      ctx.lineTo(x * (zoom / 100), y * (zoom / 100));
      ctx.stroke();
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || selectedTool !== "draw") return;

    if (currentPath.length > 1) {
      saveToHistory();
      setAnnotations((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "draw",
          pageNumber: currentPage,
          x: currentPath[0].x,
          y: currentPath[0].y,
          color: selectedColor,
          paths: currentPath,
        },
      ]);
    }

    setIsDrawing(false);
    setCurrentPath([]);
  };

  // Apply annotations to PDF and download
  const downloadWithAnnotations = async () => {
    if (!pdfDoc) return;

    try {
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const annotation of annotations) {
        const page = pdfDoc.getPage(annotation.pageNumber - 1);
        const { width, height } = page.getSize();

        // Convert color hex to RGB
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result
            ? {
                r: parseInt(result[1], 16) / 255,
                g: parseInt(result[2], 16) / 255,
                b: parseInt(result[3], 16) / 255,
              }
            : { r: 0, g: 0, b: 0 };
        };

        const color = hexToRgb(annotation.color);

        switch (annotation.type) {
          case "text":
            page.drawText(annotation.content || "", {
              x: annotation.x,
              y: height - annotation.y,
              size: annotation.fontSize || 16,
              font,
              color: rgb(color.r, color.g, color.b),
            });
            break;

          case "highlight":
            page.drawRectangle({
              x: annotation.x,
              y: height - annotation.y - (annotation.height || 20),
              width: annotation.width || 100,
              height: annotation.height || 20,
              color: rgb(color.r, color.g, color.b),
              opacity: 0.3,
            });
            break;

          case "rectangle":
            page.drawRectangle({
              x: annotation.x,
              y: height - annotation.y - (annotation.height || 50),
              width: annotation.width || 100,
              height: annotation.height || 50,
              borderColor: rgb(color.r, color.g, color.b),
              borderWidth: 2,
            });
            break;

          case "circle":
            page.drawEllipse({
              x: annotation.x,
              y: height - annotation.y,
              xScale: (annotation.width || 50) / 2,
              yScale: (annotation.height || 50) / 2,
              borderColor: rgb(color.r, color.g, color.b),
              borderWidth: 2,
            });
            break;
        }
      }

      const finalBytes = await pdfDoc.save();
      downloadPdf(finalBytes, "edited_document.pdf");
      toast.success("PDF downloaded with annotations");
    } catch (error) {
      console.error("Error saving PDF:", error);
      toast.error("Failed to save PDF");
    }
  };

  // Download PDF helper
  const downloadPdf = (bytes: Uint8Array, filename: string) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear all annotations
  const clearAnnotations = () => {
    saveToHistory();
    setAnnotations([]);
    toast.success("Annotations cleared");
  };

  // Effects
  useEffect(() => {
    if (pdfBytes && currentPage) {
      renderPage(currentPage);
    }
  }, [pdfBytes, currentPage, zoom, renderPage]);

  useEffect(() => {
    if (pdfBytes) {
      generateThumbnails();
    }
  }, [pdfBytes, generateThumbnails]);

  useEffect(() => {
    renderAnnotations(currentPage);
  }, [annotations, currentPage, renderAnnotations]);

  const visiblePages = pages.filter((p) => !p.deleted);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">PDF Editor</h1>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && loadPdf(e.target.files[0])}
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Open PDF
              </Button>
              {pdfDoc && (
                <>
                  <Button variant="outline" onClick={undo} disabled={historyIndex <= 0}>
                    <Undo className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={redo} disabled={historyIndex >= history.length - 1}>
                    <Redo className="h-4 w-4" />
                  </Button>
                  <Button variant="default" onClick={downloadWithAnnotations}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </>
              )}
            </div>
          </div>

          {!pdfDoc ? (
            <Card className="flex-1 flex items-center justify-center">
              <CardContent className="text-center py-16">
                <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Upload a PDF to get started</h2>
                <p className="text-muted-foreground mb-4">
                  Edit, annotate, merge, split, and more
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose PDF File
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex-1 flex gap-4 overflow-hidden">
              {/* Left sidebar - Page thumbnails */}
              <Card className="w-48 flex-shrink-0">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">Pages ({visiblePages.length})</CardTitle>
                </CardHeader>
                <ScrollArea className="h-[calc(100%-3rem)]">
                  <div className="p-2 space-y-2">
                    {visiblePages.map((page, index) => (
                      <div
                        key={page.pageNumber}
                        className={`relative cursor-pointer rounded border-2 transition-all ${
                          currentPage === page.pageNumber
                            ? "border-primary"
                            : "border-transparent hover:border-muted-foreground/50"
                        }`}
                        onClick={() => setCurrentPage(page.pageNumber)}
                        draggable
                        onDragStart={() => setDraggedPage(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggedPage !== null && draggedPage !== index) {
                            movePage(draggedPage, index);
                          }
                          setDraggedPage(null);
                        }}
                      >
                        {pageRenderings.get(page.pageNumber) ? (
                          <img
                            src={pageRenderings.get(page.pageNumber)}
                            alt={`Page ${page.pageNumber}`}
                            className="w-full rounded"
                          />
                        ) : (
                          <div className="w-full aspect-[3/4] bg-muted rounded flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">Loading...</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-background/80 text-center text-xs py-1">
                          {page.pageNumber}
                        </div>
                        {/* Page actions */}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-5 w-5"
                            onClick={(e) => {
                              e.stopPropagation();
                              rotatePage(page.pageNumber, "cw");
                            }}
                          >
                            <RotateCw className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-5 w-5"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePage(page.pageNumber);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              {/* Main editor area */}
              <div className="flex-1 flex flex-col gap-4 min-w-0">
                {/* Toolbar */}
                <Card className="p-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Tools */}
                    <div className="flex items-center gap-1 border-r pr-2">
                      <Button
                        size="icon"
                        variant={selectedTool === "select" ? "default" : "ghost"}
                        onClick={() => setSelectedTool("select")}
                        title="Select"
                      >
                        <Move className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={selectedTool === "text" ? "default" : "ghost"}
                        onClick={() => setSelectedTool("text")}
                        title="Add Text"
                      >
                        <Type className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={selectedTool === "draw" ? "default" : "ghost"}
                        onClick={() => setSelectedTool("draw")}
                        title="Draw"
                      >
                        <PenTool className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={selectedTool === "highlight" ? "default" : "ghost"}
                        onClick={() => setSelectedTool("highlight")}
                        title="Highlight"
                      >
                        <Highlighter className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={selectedTool === "rectangle" ? "default" : "ghost"}
                        onClick={() => setSelectedTool("rectangle")}
                        title="Rectangle"
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={selectedTool === "circle" ? "default" : "ghost"}
                        onClick={() => setSelectedTool("circle")}
                        title="Circle"
                      >
                        <Circle className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Color picker */}
                    <div className="flex items-center gap-2 border-r pr-2">
                      <Label className="text-xs">Color:</Label>
                      <input
                        type="color"
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                    </div>

                    {/* Font size */}
                    {selectedTool === "text" && (
                      <div className="flex items-center gap-2 border-r pr-2">
                        <Label className="text-xs">Size:</Label>
                        <Input
                          type="number"
                          value={fontSize}
                          onChange={(e) => setFontSize(Number(e.target.value))}
                          className="w-16 h-8"
                          min={8}
                          max={72}
                        />
                      </div>
                    )}

                    {/* Text input */}
                    {selectedTool === "text" && (
                      <div className="flex items-center gap-2 border-r pr-2">
                        <Input
                          placeholder="Enter text..."
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          className="w-40 h-8"
                        />
                      </div>
                    )}

                    {/* Zoom controls */}
                    <div className="flex items-center gap-2 border-r pr-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setZoom((z) => Math.max(25, z - 25))}
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-sm w-12 text-center">{zoom}%</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setZoom((z) => Math.min(200, z + 25))}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Page actions */}
                    <div className="flex items-center gap-1 border-r pr-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => rotatePage(currentPage, "ccw")}
                        title="Rotate Left"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => rotatePage(currentPage, "cw")}
                        title="Rotate Right"
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => duplicatePage(currentPage)}
                        title="Duplicate Page"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deletePage(currentPage)}
                        title="Delete Page"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Merge */}
                    <input
                      ref={mergeInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && mergePdf(e.target.files[0])}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => mergeInputRef.current?.click()}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Merge PDF
                    </Button>

                    {/* Split dialog */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Scissors className="mr-1 h-4 w-4" />
                          Split PDF
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Split PDF</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Start Page</Label>
                              <Input type="number" id="splitStart" defaultValue={1} min={1} max={visiblePages.length} />
                            </div>
                            <div>
                              <Label>End Page</Label>
                              <Input type="number" id="splitEnd" defaultValue={visiblePages.length} min={1} max={visiblePages.length} />
                            </div>
                          </div>
                          <Button
                            onClick={() => {
                              const start = parseInt((document.getElementById("splitStart") as HTMLInputElement).value);
                              const end = parseInt((document.getElementById("splitEnd") as HTMLInputElement).value);
                              if (start > 0 && end >= start && end <= visiblePages.length) {
                                splitPdf(start, end);
                              } else {
                                toast.error("Invalid page range");
                              }
                            }}
                          >
                            Split & Download
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Clear annotations */}
                    <Button size="sm" variant="ghost" onClick={clearAnnotations}>
                      <Eraser className="mr-1 h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </Card>

                {/* Canvas area */}
                <Card className="flex-1 overflow-auto">
                  <div className="p-4 flex justify-center">
                    <div className="relative inline-block shadow-lg">
                      <canvas ref={canvasRef} className="block" />
                      <canvas
                        ref={annotationCanvasRef}
                        className="absolute top-0 left-0 cursor-crosshair"
                        onClick={handleCanvasClick}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      />
                    </div>
                  </div>
                </Card>

                {/* Page navigation */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {visiblePages.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.min(visiblePages.length, p + 1))}
                    disabled={currentPage >= visiblePages.length}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Right sidebar - Annotations */}
              <Card className="w-64 flex-shrink-0">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Annotations ({annotations.filter((a) => a.pageNumber === currentPage).length})
                  </CardTitle>
                </CardHeader>
                <ScrollArea className="h-[calc(100%-3rem)]">
                  <div className="p-2 space-y-2">
                    {annotations
                      .filter((a) => a.pageNumber === currentPage)
                      .map((annotation) => (
                        <div
                          key={annotation.id}
                          className="p-2 rounded bg-muted text-sm flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: annotation.color }}
                            />
                            <span className="capitalize">{annotation.type}</span>
                            {annotation.type === "text" && (
                              <span className="text-muted-foreground truncate max-w-20">
                                {annotation.content}
                              </span>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => {
                              saveToHistory();
                              setAnnotations((prev) =>
                                prev.filter((a) => a.id !== annotation.id)
                              );
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    {annotations.filter((a) => a.pageNumber === currentPage).length === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-4">
                        No annotations on this page
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
