import React from "react";
import { Progress } from "@/components/ui/progress";

interface MacroCardProps {
  label: string;
  current: number;
  goal: number;
  unit?: string;
  color: string;
}

export const MacroCard: React.FC<MacroCardProps> = ({ 
  label, 
  current, 
  goal, 
  unit = "g",
  color
}) => {
  const percentage = Math.min((current / goal) * 100, 100);

  return (
    <div className="flex-1 bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{current}/{goal}{unit}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );
};
