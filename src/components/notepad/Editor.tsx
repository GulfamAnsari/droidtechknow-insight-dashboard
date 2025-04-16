
import React, { useRef, useState } from 'react';
import { Editor as TinyMCEEditor } from '@tinymce/tinymce-react';
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorProps {
  content?: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

const Editor: React.FC<EditorProps> = ({ 
  content = '', 
  onChange, 
  readOnly = false,
  placeholder = 'Start writing your note here...'
}) => {
  const editorRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={cn(
      "relative border rounded-md flex flex-col",
      isFullscreen ? "fixed inset-0 z-50 bg-background p-6" : "min-h-[300px]"
    )}>
      <div className="flex justify-end p-2 border-b">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleFullscreen}
          className="hover:bg-muted"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="flex-grow">
        <TinyMCEEditor
          onInit={(evt, editor) => editorRef.current = editor}
          initialValue={content}
          onEditorChange={(newContent) => {
            onChange(newContent);
          }}
          disabled={readOnly}
          init={{
            height: isFullscreen ? 'calc(100vh - 120px)' : 300,
            menubar: false,
            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
              'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount', 'autoresize'
            ],
            toolbar: 'undo redo | blocks | ' +
              'bold italic forecolor | alignleft aligncenter ' +
              'alignright alignjustify | bullist numlist outdent indent | ' +
              'removeformat | help',
            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
            placeholder: placeholder,
            autoresize_bottom_margin: 16,
            resize: false,
            branding: false,
            statusbar: false,
          }}
        />
      </div>
    </div>
  );
};

export default Editor;
