
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Save, 
  Trash2, 
  Download,
  MoreHorizontal,
  FileText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface EditorToolbarProps {
  selectedNote: Note | null;
  title: string;
  hasChanges: boolean;
  onTitleChange: (title: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onShowNotesList: () => void;
  onCreateNew: () => void;
}

const EditorToolbar = ({
  selectedNote,
  title,
  hasChanges,
  onTitleChange,
  onSave,
  onDelete,
  onDownload,
  onShowNotesList,
  onCreateNew
}: EditorToolbarProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Note title..."
              className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
            />
            {hasChanges && (
              <span className="text-xs text-orange-500 font-medium whitespace-nowrap">
                • Unsaved
              </span>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSave} disabled={!hasChanges}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShowNotesList}>
                <FileText className="h-4 w-4 mr-2" />
                All Notes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCreateNew}>
                <FileText className="h-4 w-4 mr-2" />
                New Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {selectedNote && (
          <div className="text-xs text-muted-foreground">
            Created: {new Date(selectedNote.createdAt).toLocaleDateString()} • 
            Last modified: {new Date(selectedNote.updatedAt).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-b p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Note title..."
            className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 bg-transparent max-w-md"
          />
          {hasChanges && (
            <span className="text-xs text-orange-500 font-medium">
              • Unsaved changes
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onShowNotesList}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            All Notes
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateNew}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            New Note
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={!hasChanges}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
      
      {selectedNote && (
        <div className="text-xs text-muted-foreground">
          Created: {new Date(selectedNote.createdAt).toLocaleDateString()} • 
          Last modified: {new Date(selectedNote.updatedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default EditorToolbar;
