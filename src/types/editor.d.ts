declare module '@editorjs/editorjs' {
  export interface OutputData {
    time: number;
    version: string;
    blocks: OutputBlockData[];
  }

  export interface OutputBlockData {
    id?: string;
    type: string;
    data: any;
  }

  export interface EditorConfig {
    /**
     * Element that EditorJS should append to
     */
    holder?: string | HTMLElement;

    /**
     * Initial Editor data
     */
    data?: OutputData;

    /**
     * Available Tools
     */
    tools?: {
      [toolName: string]: any;
    };

    /**
     * Placeholder for empty editor
     */
    placeholder?: string;

    /**
     * Read-only mode
     */
    readOnly?: boolean;

    /**
     * This callback will be called after Editor.js is ready to work
     */
    onReady?: () => void;

    /**
     * This callback will be called after content has been changed
     */
    onChange?: () => void;

    /**
     * Autofocus on load
     */
    autofocus?: boolean;
  }

  export interface API {
    blocks: {
      render: (data: OutputData) => Promise<void>;
      renderFromHTML: (data: string) => Promise<void>;
      delete: (blockIndex?: number) => void;
      getCurrentBlockIndex: () => number;
      getBlocksCount: () => number;
      save: () => Promise<OutputData>;
    };
    caret: {
      focus: () => void;
    };
    events: {
      on: (eventName: string, callback: (data: any) => void) => void;
      off: (eventName: string, callback: (data: any) => void) => void;
    };
    saver: {
      save: () => Promise<OutputData>;
    };
  }

  export default class EditorJS {
    constructor(config?: EditorConfig);
    
    isReady: boolean;
    
    /** Saves Editor data as a Promise */
    save(): Promise<OutputData>;
    
    /** Returns Editor API object */
    readonly api: API;
    
    /** Clears Editor */
    clear(): void;
    
    /** Destroys the Editor */
    destroy(): void;
    
    /** Sets Editor to read-only mode */
    readOnly(): void;

    /** Renders the data in the editor */
    render(data: OutputData): Promise<void>;
  }
}

declare module '@editorjs/header' {
  import { ToolConstructable } from '@editorjs/editorjs';
  export default class Header implements ToolConstructable {
    static get toolbox(): any;
  }
}

declare module '@editorjs/list' {
  import { ToolConstructable } from '@editorjs/editorjs';
  export default class List implements ToolConstructable {
    static get toolbox(): any;
  }
}

declare module '@editorjs/paragraph' {
  import { ToolConstructable } from '@editorjs/editorjs';
  export default class Paragraph implements ToolConstructable {
    static get toolbox(): any;
  }
}

declare module '@editorjs/checklist' {
  import { ToolConstructable } from '@editorjs/editorjs';
  export default class Checklist implements ToolConstructable {
    static get toolbox(): any;
  }
}

declare module '@editorjs/quote' {
  import { ToolConstructable } from '@editorjs/editorjs';
  export default class Quote implements ToolConstructable {
    static get toolbox(): any;
  }
}
