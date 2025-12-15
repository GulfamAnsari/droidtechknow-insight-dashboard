import React from "react";

interface CalorieRingProps {
  consumed: number;
  goal: number;
  size?: number;
}

export const CalorieRing: React.FC<CalorieRingProps> = ({ 
  consumed, 
  goal, 
  size = 200 
}) => {
  const percentage = Math.min((consumed / goal) * 100, 100);
  const remaining = Math.max(goal - consumed, 0);
  
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Color based on progress
  const getColor = () => {
    if (percentage > 100) return "hsl(0, 84%, 60%)"; // red - over
    if (percentage > 80) return "hsl(45, 93%, 47%)"; // yellow - warning
    return "hsl(142, 76%, 36%)"; // green - good
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold text-foreground">{consumed.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground">kcal consumed</span>
        <span className="text-xs text-muted-foreground mt-1">{remaining.toLocaleString()} left</span>
      </div>
    </div>
  );
};
