
import React, { useEffect, useRef, useState } from 'react';
import EditorJS, { OutputData } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Paragraph from '@editorjs/paragraph';
import Checklist from '@editorjs/checklist';
import Quote from '@editorjs/quote';

interface EditorProps {
  data?: OutputData;
  onChange: (data: OutputData) => void;
  readOnly?: boolean;
  placeholder?: string;
}

const Editor: React.FC<EditorProps> = ({ 
  data, 
  onChange, 
  readOnly = false,
  placeholder = 'Start writing your note here...'
}) => {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize editor when component mounts
  useEffect(() => {
    if (!holderRef.current) return;

    const editor = new EditorJS({
      holder: holderRef.current,
      // @ts-ignore - EditorJS types in our definition file are incomplete
      tools: {
        header: {
          class: Header,
          inlineToolbar: true,
          config: {
            levels: [2, 3, 4],
            defaultLevel: 2
          }
        },
        list: {
          class: List,
          inlineToolbar: true,
        },
        paragraph: {
          class: Paragraph,
          inlineToolbar: true,
        },
        checklist: {
          class: Checklist,
          inlineToolbar: true,
        },
        quote: {
          class: Quote,
          inlineToolbar: true,
        }
      },
      data: data,
      placeholder: placeholder,
      readOnly: readOnly,
      onChange: async () => {
        const savedData = await editorRef.current?.save();
        if (savedData) {
          onChange(savedData);
        }
      },
      onReady: () => {
        setIsReady(true);
      },
    });

    editorRef.current = editor;

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, []);

  // Update editor data when prop changes
  useEffect(() => {
    if (editorRef.current && isReady && data) {
      // Only update the data if different to avoid loops
      // @ts-ignore - The render method exists in EditorJS but is missing in our type definitions
      editorRef.current.render(data);
    }
  }, [data, isReady]);

  return (
    <div className="prose max-w-none w-full min-h-[300px]">
      <div ref={holderRef} className="editor-js" />
    </div>
  );
};

export default Editor;
