
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
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold flex items-center">
            <BookOpen className="mr-2 h-6 w-6" />
            Notepad
          </h1>
        </div>
        
        <div className="flex gap-2 items-center">
          <div className="mr-4">
            <RadioGroup 
              value={theme} 
              onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
              className="flex space-x-2"
            >
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="light" id="theme-light" />
                <label htmlFor="theme-light" className="flex items-center">
                  <Sun className="h-4 w-4" />
                </label>
              </div>
              
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="dark" id="theme-dark" />
                <label htmlFor="theme-dark" className="flex items-center">
                  <Moon className="h-4 w-4" />
                </label>
              </div>
            </RadioGroup>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={saveNote}
          >
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto flex flex-col">
        <div className="p-4 border-b">
          <Input
            placeholder="Note title"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            className="text-lg font-medium"
          />
        </div>
        
        <div className="flex-1 overflow-auto p-4">
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
