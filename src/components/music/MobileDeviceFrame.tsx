import React from "react";

interface MobileDeviceFrameProps {
  children: React.ReactNode;
  onClose: () => void;
}

const MobileDeviceFrame = ({ children, onClose }: MobileDeviceFrameProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm p-4">
      {/* Phone Frame */}
      <div className="relative mr-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
        >
          ✕
        </button>
        
        {/* Phone outer shell */}
        <div className="relative bg-zinc-800 rounded-[3rem] p-3 shadow-2xl">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-zinc-800 rounded-b-2xl z-10 flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-600" />
            <div className="w-16 h-4 rounded-full bg-zinc-900" />
          </div>
          
          {/* Screen bezel */}
          <div className="relative bg-black rounded-[2.2rem] overflow-hidden">
            {/* Status bar */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-background/80 backdrop-blur z-10 flex items-center justify-between px-6 text-xs">
              <span className="font-medium">9:41</span>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 16.5l3-3h1.5L10 17l3.5-3.5H15l3 3V20H2v-3.5z" />
                </svg>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <div className="w-6 h-3 border border-current rounded-sm relative">
                  <div className="absolute inset-0.5 bg-current rounded-sm" style={{ width: "70%" }} />
                </div>
              </div>
            </div>
            
            {/* Content area - iPhone dimensions (390x844 scaled down) */}
            <div 
              className="w-[375px] h-[700px] overflow-hidden bg-background"
              style={{ 
                overflowY: "auto",
                overflowX: "hidden"
              }}
            >
              <div className="h-full overflow-auto pt-8">
                {children}
              </div>
            </div>
            
            {/* Home indicator */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-foreground/30 rounded-full" />
          </div>
        </div>
        
        {/* Side button */}
        <div className="absolute right-0 top-24 w-1 h-12 bg-zinc-700 rounded-l" />
        <div className="absolute left-0 top-20 w-1 h-8 bg-zinc-700 rounded-r" />
        <div className="absolute left-0 top-32 w-1 h-12 bg-zinc-700 rounded-r" />
      </div>
    </div>
  );
};

export default MobileDeviceFrame;
