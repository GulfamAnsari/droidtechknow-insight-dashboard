
import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo, 
  FileText,
  Save,
  Trash2,
  Plus
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const Notepad = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [showNewNote, setShowNewNote] = useState(false);
  
  // Load notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);
  
  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);
  
  // Find the active note
  const activeNote = notes.find(note => note.id === activeNoteId) || null;
  
  // Initialize editor with content from active note
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: activeNote?.content || '',
    onUpdate: ({ editor }) => {
      if (activeNoteId) {
        updateNoteContent(activeNoteId, editor.getHTML());
      }
    },
  });
  
  // Update editor content when active note changes
  useEffect(() => {
    if (editor && activeNote) {
      editor.commands.setContent(activeNote.content);
      setNoteTitle(activeNote.title);
    } else if (editor && !activeNote) {
      editor.commands.setContent('');
      setNoteTitle('');
    }
  }, [activeNoteId, activeNote, editor]);
  
  // Create a new note
  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: noteTitle || 'Untitled Note',
      content: editor ? editor.getHTML() : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setNotes([...notes, newNote]);
    setActiveNoteId(newNote.id);
    setShowNewNote(false);
  };
  
  // Update note title
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
  };
  
  // Update note content
  const updateNoteContent = (id: string, content: string) => {
    setNotes(notes.map(note => 
      note.id === id 
        ? { 
            ...note, 
            content, 
            updatedAt: new Date().toISOString() 
          } 
        : note
    ));
  };
  
  // Delete note
  const deleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(notes.length > 1 ? notes[0].id : null);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="container mx-auto p-4 h-[calc(100vh-8rem)]">
      <h1 className="text-3xl font-bold mb-6">Notepad</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Note List Section */}
        <div className="md:col-span-1 border rounded-lg bg-background overflow-hidden flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">Notes ({notes.length})</h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setActiveNoteId(null);
                setNoteTitle('');
                if (editor) editor.commands.setContent('');
                setShowNewNote(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {notes.length === 0 && !showNewNote ? (
              <div className="p-6 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No notes yet.</p>
                <Button 
                  className="mt-4" 
                  variant="outline"
                  onClick={() => setShowNewNote(true)}
                >
                  Create your first note
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {notes.map(note => (
                  <li key={note.id}>
                    <button
                      className={cn(
                        "w-full text-left p-3 hover:bg-accent transition-colors",
                        activeNoteId === note.id ? "bg-accent" : ""
                      )}
                      onClick={() => setActiveNoteId(note.id)}
                    >
                      <h3 className="font-medium truncate">{note.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(note.updatedAt)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {note.content.replace(/<[^>]*>/g, ' ')}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {/* Editor Section */}
        <div className="md:col-span-2 border rounded-lg overflow-hidden flex flex-col bg-background">
          {showNewNote || activeNoteId ? (
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
              
              <div className="p-2 border-b bg-muted/30 flex flex-wrap gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={editor?.isActive('bold') ? 'bg-accent' : ''}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={editor?.isActive('italic') ? 'bg-accent' : ''}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={editor?.isActive('bulletList') ? 'bg-accent' : ''}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={editor?.isActive('orderedList') ? 'bg-accent' : ''}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  className={editor?.isActive('blockquote') ? 'bg-accent' : ''}
                >
                  <Quote className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => editor?.chain().focus().undo().run()}
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => editor?.chain().focus().redo().run()}
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                <EditorContent editor={editor} className="prose max-w-none min-h-[30rem]" />
              </div>
              
              <div className="p-3 border-t flex justify-between items-center bg-muted/30">
                {activeNoteId ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Last edited: {activeNote ? formatDate(activeNote.updatedAt) : ''}
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteNote(activeNoteId)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowNewNote(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={createNewNote}
                      disabled={!noteTitle.trim()}
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-1" /> Save Note
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full p-6 text-center text-muted-foreground">
              <div>
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-2">No Note Selected</h3>
                <p className="mb-4">Select a note from the list or create a new one</p>
                <Button 
                  onClick={() => setShowNewNote(true)}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-1" /> Create New Note
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
