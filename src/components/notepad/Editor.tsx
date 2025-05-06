
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

const Editor: React.FC<EditorProps> = ({ 
  content, 
  onChange, 
  readOnly = false,
  placeholder = 'Start writing your note here...'
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { theme } = useTheme();

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Auto-resize textarea as content grows
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content]);

  return (
    <div className={cn(
      "relative border rounded-md flex flex-col",
      isFullscreen ? "fixed inset-0 z-50 bg-background p-6" : "min-h-[300px]"
    )} style={{ height: '100%'}}>
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
      
      <div className="flex-grow p-2">
        <textarea
          ref={textareaRef}
          className={cn(
            "w-full h-full p-3 resize-none focus:outline-none bg-transparent",
            isFullscreen ? "h-[calc(100vh-120px)]" : "min-h-[250px]",
            theme === "dark" ? "text-foreground" : "text-foreground"
          )}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={readOnly}
          style={{ 
            lineHeight: '1.5'
          }}
        />
      </div>
    </div>
  );
};

export default Editor;
