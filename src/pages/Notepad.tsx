
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

const Notepad = () => {
  const [noteTitle, setNoteTitle] = useState<string>("");
  const [noteContent, setNoteContent] = useState<string>("");
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  
  // Load note from localStorage
  useEffect(() => {
    const savedTitle = localStorage.getItem(NOTEPAD_TITLE_KEY);
    const savedContent = localStorage.getItem(NOTEPAD_STORAGE_KEY);
    
    if (savedTitle) {
      setNoteTitle(savedTitle);
    }
    
    if (savedContent) {
      setNoteContent(savedContent);
    }
  }, []);
  
  // Save note to localStorage
  const saveNote = () => {
    localStorage.setItem(NOTEPAD_TITLE_KEY, noteTitle);
    localStorage.setItem(NOTEPAD_STORAGE_KEY, noteContent);
    
    // Optional: Show save confirmation
    alert("Note saved successfully!");
  };
  
  const updateNoteContent = (content: string) => {
    setNoteContent(content);
  };
  
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col inner-container">
      <div className="flex-1 overflow-auto flex flex-col w-full">
        <div className="flex-1 overflow-auto p-4 w-full">
          <Editor 
            content={noteContent} 
            onChange={updateNoteContent}
          />
        </div>
        
        <div className="p-3 border-t flex justify-between items-center bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {noteContent.length} characters
          </p>
          
          <Button
            onClick={saveNote}
            size="sm"
          >
            <Save className="h-4 w-4 mr-1" /> Save Note
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Notepad;
