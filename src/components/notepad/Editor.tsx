
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import EditorToolbar from './EditorToolbar';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface EditorProps {
  selectedNote: Note | null;
  onSave: (note: Note) => void;
  onDelete: (noteId: string) => void;
  onCreateNew: () => void;
  onShowNotesList: () => void;
}

const Editor = ({ selectedNote, onSave, onDelete, onCreateNew, onShowNotesList }: EditorProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
      setHasChanges(false);
    } else {
      setTitle('');
      setContent('');
      setHasChanges(false);
    }
  }, [selectedNote]);

  useEffect(() => {
    if (selectedNote) {
      const hasChanged = 
        title !== selectedNote.title || 
        content !== selectedNote.content;
      setHasChanges(hasChanged);
    }
  }, [title, content, selectedNote]);

  const handleSave = () => {
    if (!selectedNote) return;
    
    const updatedNote = {
      ...selectedNote,
      title: title || 'Untitled',
      content,
      updatedAt: new Date().toISOString(),
    };
    
    onSave(updatedNote);
    setHasChanges(false);
    toast.success('Note saved successfully');
  };

  const handleDelete = () => {
    if (!selectedNote) return;
    
    onDelete(selectedNote.id);
    toast.success('Note deleted successfully');
  };

  const handleDownload = () => {
    if (!selectedNote) return;

    const noteContent = `${title || 'Untitled'}\n\n${content}`;
    const blob = new Blob([noteContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'Untitled'}.txt`;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Note downloaded successfully');
  };

  // Auto-save functionality
  useEffect(() => {
    if (!hasChanges || !selectedNote) return;

    const autoSaveTimer = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => clearTimeout(autoSaveTimer);
  }, [hasChanges, title, content, selectedNote]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            if (selectedNote && hasChanges) {
              handleSave();
            }
            break;
          case 'n':
            e.preventDefault();
            onCreateNew();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNote, hasChanges, onCreateNew]);

  if (!selectedNote) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-4">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold text-muted-foreground">
              No note selected
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Select a note from the sidebar or create a new one
            </p>
          </div>
          <Button onClick={onCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Create New Note
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <EditorToolbar
        selectedNote={selectedNote}
        title={title}
        hasChanges={hasChanges}
        onTitleChange={setTitle}
        onSave={handleSave}
        onDelete={handleDelete}
        onDownload={handleDownload}
        onShowNotesList={onShowNotesList}
        onCreateNew={onCreateNew}
      />

      <div className="flex-1 p-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing your note..."
          className="w-full h-full resize-none border-none outline-none text-sm leading-relaxed bg-transparent"
        />
      </div>

      <div className="border-t p-4">
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <div>
            {content.length} characters • {content.split(/\s+/).filter(word => word.length > 0).length} words
          </div>
          <div className="flex gap-4">
            <span>Ctrl+S to save</span>
            <span>Ctrl+N for new note</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
