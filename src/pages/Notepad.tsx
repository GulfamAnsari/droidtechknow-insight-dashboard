
import { useState, useEffect } from "react";
import EditorJS, { OutputData } from "@editorjs/editorjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Save,
  Menu,
  FileText,
  X,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import NoteSidebar, { Note } from "@/components/notepad/NoteSidebar";
import Editor from "@/components/notepad/Editor";

const Notepad = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState<OutputData | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const isMobile = useIsMobile();
  
  // Load notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (error) {
        console.error('Error parsing notes from localStorage:', error);
        setNotes([]);
      }
    }
  }, []);
  
  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);
  
  // Find the active note
  const activeNote = notes.find(note => note.id === activeNoteId) || null;
  
  // Update editor content when active note changes
  useEffect(() => {
    if (activeNote) {
      setNoteTitle(activeNote.title);
      try {
        // Try to parse the content as JSON first (for EditorJS data)
        const parsedContent = JSON.parse(activeNote.content);
        setNoteContent(parsedContent);
      } catch (e) {
        // If parsing fails, create a new EditorJS data structure with the content as HTML
        setNoteContent({
          time: new Date().getTime(),
          version: "2.22.2",
          blocks: [
            {
              type: "paragraph",
              data: {
                text: activeNote.content
              }
            }
          ]
        });
      }
    } else {
      setNoteTitle("");
      setNoteContent(null);
    }
  }, [activeNoteId, activeNote]);
  
  const createNewNote = () => {
    const defaultContent: OutputData = {
      time: new Date().getTime(),
      version: "2.22.2",
      blocks: [
        {
          type: "paragraph",
          data: {
            text: ""
          }
        }
      ]
    };
    
    const newNote: Note = {
      id: Date.now().toString(),
      title: noteTitle || 'Untitled Note',
      content: JSON.stringify(defaultContent),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      starred: false
    };
    
    setNotes([...notes, newNote]);
    setActiveNoteId(newNote.id);
    setNoteContent(defaultContent);
  };
  
  const updateNoteTitle = (id: string, title: string) => {
    setNotes(notes.map(note => 
      note.id === id 
        ? { 
            ...note, 
            title, 
            updatedAt: new Date().toISOString() 
          } 
        : note
    ));
    if (id === activeNoteId) {
      setNoteTitle(title);
    }
  };
  
  const updateNoteContent = (data: OutputData) => {
    if (!activeNoteId) return;
    
    setNoteContent(data);
    setNotes(notes.map(note => 
      note.id === activeNoteId 
        ? { 
            ...note, 
            content: JSON.stringify(data), 
            updatedAt: new Date().toISOString() 
          } 
        : note
    ));
  };
  
  const deleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(notes.length > 1 ? notes[0].id : null);
    }
  };
  
  const toggleNoteStar = (id: string) => {
    setNotes(notes.map(note => 
      note.id === id 
        ? { 
            ...note, 
            starred: !note.starred,
            updatedAt: new Date().toISOString() 
          } 
        : note
    ));
  };
  
  const handleStartNewNote = () => {
    setActiveNoteId(null);
    setNoteTitle("");
    setNoteContent(null);
  };
  
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(true)}
              className="mr-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-2xl font-bold flex items-center">
            <BookOpen className="mr-2 h-6 w-6" />
            Notepad
          </h1>
        </div>
        <div className="flex gap-2">
          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              {showSidebar ? <X className="mr-1 h-4 w-4" /> : <FileText className="mr-1 h-4 w-4" />}
              {showSidebar ? "Hide Sidebar" : "Show Sidebar"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartNewNote}
          >
            New Note
          </Button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <NoteSidebar
          notes={notes}
          activeNoteId={activeNoteId}
          onSelectNote={setActiveNoteId}
          onCreateNote={createNewNote}
          onDeleteNote={deleteNote}
          onUpdateNoteTitle={updateNoteTitle}
          onToggleStar={toggleNoteStar}
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
        />
        
        <div className="flex-1 overflow-auto flex flex-col">
          {activeNoteId || noteTitle ? (
            <>
              <div className="p-4 border-b">
                <Input
                  placeholder="Note title"
                  value={noteTitle}
                  onChange={(e) => {
                    setNoteTitle(e.target.value);
                    if (activeNoteId) {
                      updateNoteTitle(activeNoteId, e.target.value);
                    }
                  }}
                  className="text-lg font-medium"
                />
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {noteContent ? (
                  <Editor 
                    data={noteContent} 
                    onChange={updateNoteContent} 
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Start typing to create content...
                  </div>
                )}
              </div>
              
              <div className="p-3 border-t flex justify-between items-center bg-muted/30">
                {activeNoteId ? (
                  <p className="text-xs text-muted-foreground">
                    Last edited: {activeNote ? new Date(activeNote.updatedAt).toLocaleString() : ''}
                  </p>
                ) : (
                  <span></span>
                )}
                
                {!activeNoteId && (
                  <Button
                    onClick={createNewNote}
                    disabled={!noteTitle.trim()}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-1" /> Save Note
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full p-6 text-center text-muted-foreground">
              <div>
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-2">No Note Selected</h3>
                <p className="mb-4">Select a note from the sidebar or create a new one</p>
                <Button 
                  onClick={handleStartNewNote}
                  variant="outline"
                >
                  Create New Note
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notepad;
