
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Menu,
  FileText,
  BookOpen,
  Maximize,
  Minimize,
  List
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import Editor from "@/components/notepad/Editor";
import NotesListModal from "@/components/notepad/NotesListModal";

const NOTEPAD_STORAGE_KEY = 'simple-notepad-content';
const NOTEPAD_TITLE_KEY = 'simple-notepad-title';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const Notepad = () => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotesList, setShowNotesList] = useState(false);
  const isMobile = useIsMobile();
  
  // Load note from localStorage
  useEffect(() => {
    const savedTitle = localStorage.getItem(NOTEPAD_TITLE_KEY);
    const savedContent = localStorage.getItem(NOTEPAD_STORAGE_KEY);
    
    if (savedTitle || savedContent) {
      const note: Note = {
        id: 'default',
        title: savedTitle || 'Untitled',
        content: savedContent || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSelectedNote(note);
    }
  }, []);

  const handleSave = (note: Note) => {
    // Save current note
    localStorage.setItem(NOTEPAD_TITLE_KEY, note.title);
    localStorage.setItem(NOTEPAD_STORAGE_KEY, note.content);
    setSelectedNote(note);

    // Save to all notes list
    const allNotes = JSON.parse(localStorage.getItem('allNotes') || '[]');
    const existingIndex = allNotes.findIndex((n: Note) => n.id === note.id);
    
    if (existingIndex >= 0) {
      allNotes[existingIndex] = note;
    } else {
      allNotes.push(note);
    }
    
    localStorage.setItem('allNotes', JSON.stringify(allNotes));
  };

  const handleDelete = (noteId: string) => {
    // Clear current note storage
    localStorage.removeItem(NOTEPAD_TITLE_KEY);
    localStorage.removeItem(NOTEPAD_STORAGE_KEY);
    setSelectedNote(null);

    // Remove from all notes list
    const allNotes = JSON.parse(localStorage.getItem('allNotes') || '[]');
    const updatedNotes = allNotes.filter((n: Note) => n.id !== noteId);
    localStorage.setItem('allNotes', JSON.stringify(updatedNotes));
  };

  const handleCreateNew = () => {
    const newNote: Note = {
      id: `note_${Date.now()}`,
      title: '',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedNote(newNote);
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    localStorage.setItem(NOTEPAD_TITLE_KEY, note.title);
    localStorage.setItem(NOTEPAD_STORAGE_KEY, note.content);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-[calc(100vh-4rem)]'} flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <span className="font-semibold">Notepad</span>
          {selectedNote?.title && (
            <span className="text-muted-foreground">- {selectedNote.title}</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotesList(true)}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            All Notes
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateNew}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            New Note
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="gap-2"
          >
            {isFullscreen ? (
              <>
                <Minimize className="h-4 w-4" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize className="h-4 w-4" />
                Fullscreen
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className={`flex-1 overflow-auto flex flex-col w-full ${isFullscreen ? '' : 'inner-container'}`}>
        <Editor 
          selectedNote={selectedNote}
          onSave={handleSave}
          onDelete={handleDelete}
          onCreateNew={handleCreateNew}
        />
      </div>

      {/* Notes List Modal */}
      <NotesListModal
        open={showNotesList}
        onOpenChange={setShowNotesList}
        onSelectNote={handleSelectNote}
        onCreateNew={handleCreateNew}
      />
    </div>
  );
};

export default Notepad;
