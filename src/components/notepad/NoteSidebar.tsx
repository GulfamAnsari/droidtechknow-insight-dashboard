import React, { useState } from "react";
import { 
  FileText,
  Plus,
  Star,
  Trash2,
  X,
  PenLine,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  starred?: boolean;
}

// Helper function to strip HTML tags for preview
const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

interface NoteSidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  onUpdateNoteTitle: (id: string, title: string) => void;
  onToggleStar: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const NoteSidebar: React.FC<NoteSidebarProps> = ({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onUpdateNoteTitle,
  onToggleStar,
  isOpen,
  onClose
}) => {
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const isMobile = useIsMobile();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
    });
  };

  const startEditingTitle = (note: Note) => {
    setEditingTitleId(note.id);
    setEditedTitle(note.title);
  };

  const saveEditedTitle = () => {
    if (editingTitleId && editedTitle.trim()) {
      onUpdateNoteTitle(editingTitleId, editedTitle);
      setEditingTitleId(null);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center">
          <BookOpen className="mr-2 h-5 w-5" />
          <h2 className="font-semibold">Notes ({notes.length})</h2>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCreateNote}
            title="New Note"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {isMobile && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="overflow-y-auto flex-1">
        {notes.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>No notes yet</p>
            <Button 
              className="mt-4" 
              variant="outline"
              onClick={onCreateNote}
            >
              Create your first note
            </Button>
          </div>
        ) : (
          <ul className="divide-y">
            {notes.map(note => (
              <li key={note.id} className="relative group">
                {editingTitleId === note.id ? (
                  <div className="p-3">
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onBlur={saveEditedTitle}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditedTitle()}
                      autoFocus
                      className="mb-2"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEditedTitle}>Save</Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setEditingTitleId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    className={cn(
                      "w-full text-left p-3 hover:bg-accent transition-colors",
                      activeNoteId === note.id ? "bg-accent" : ""
                    )}
                    onClick={() => onSelectNote(note.id)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate flex items-center">
                        {note.starred && <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />}
                        {note.title}
                      </h3>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStar(note.id);
                          }}
                        >
                          <Star className={cn("h-3 w-3", note.starred && "fill-yellow-400 text-yellow-400")} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingTitle(note);
                          }}
                        >
                          <PenLine className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-destructive" 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNote(note.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(note.updatedAt)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {stripHtml(note.content)}
                    </p>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="p-0 w-[280px] sm:w-[350px]">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className={cn("w-[280px] flex-shrink-0 border-r", isOpen ? "block" : "hidden")}>
      {sidebarContent}
    </div>
  );
};

export default NoteSidebar;
