
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Save,
  Menu,
  FileText,
  X,
  BookOpen,
  Moon,
  Sun
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import Editor from "@/components/notepad/Editor";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  
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
    localStorage.setItem(NOTEPAD_TITLE_KEY, note.title);
    localStorage.setItem(NOTEPAD_STORAGE_KEY, note.content);
    setSelectedNote(note);
  };

  const handleDelete = (noteId: string) => {
    localStorage.removeItem(NOTEPAD_TITLE_KEY);
    localStorage.removeItem(NOTEPAD_STORAGE_KEY);
    setSelectedNote(null);
  };

  const handleCreateNew = () => {
    const newNote: Note = {
      id: 'default',
      title: '',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedNote(newNote);
  };
  
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col inner-container">
      <div className="flex-1 overflow-auto flex flex-col w-full">
        <Editor 
          selectedNote={selectedNote}
          onSave={handleSave}
          onDelete={handleDelete}
          onCreateNew={handleCreateNew}
        />
      </div>
    </div>
  );
};

export default Notepad;
