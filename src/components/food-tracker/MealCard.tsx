import React from "react";
import { Plus, Coffee, Sun, Moon, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MealEntry } from "./types";

interface MealCardProps {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  entries: MealEntry[];
  onAddFood: () => void;
  onRemoveEntry: (id: string) => void;
}

const mealConfig = {
  breakfast: {
    icon: Coffee,
    label: "Breakfast",
    color: "hsl(45, 93%, 47%)",
    bgColor: "hsl(45, 93%, 97%)",
    time: "6:00 - 10:00"
  },
  lunch: {
    icon: Sun,
    label: "Lunch",
    color: "hsl(142, 76%, 36%)",
    bgColor: "hsl(142, 76%, 97%)",
    time: "12:00 - 14:00"
  },
  dinner: {
    icon: Moon,
    label: "Dinner",
    color: "hsl(221, 83%, 53%)",
    bgColor: "hsl(221, 83%, 97%)",
    time: "18:00 - 21:00"
  },
  snacks: {
    icon: Cookie,
    label: "Snacks",
    color: "hsl(280, 65%, 60%)",
    bgColor: "hsl(280, 65%, 97%)",
    time: "Any time"
  }
};

export const MealCard: React.FC<MealCardProps> = ({ 
  mealType, 
  entries, 
  onAddFood,
  onRemoveEntry 
}) => {
  const config = mealConfig[mealType];
  const Icon = config.icon;
  
  const totalCalories = entries.reduce((sum, entry) => 
    sum + (entry.foodItem.calories * entry.quantity), 0
  );

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div 
        className="p-4 flex items-center justify-between"
        style={{ backgroundColor: config.bgColor }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: config.color }}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{config.label}</h3>
            <p className="text-xs text-muted-foreground">{config.time}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-foreground">{totalCalories}</span>
          <span className="text-sm text-muted-foreground ml-1">kcal</span>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            No food logged yet
          </p>
        ) : (
          entries.map((entry) => (
            <div 
              key={entry.id} 
              className="flex items-center justify-between p-3 bg-muted/50 rounded-xl group"
            >
              <div className="flex items-center gap-3">
                {entry.foodItem.imageUrl ? (
                  <img 
                    src={entry.foodItem.imageUrl} 
                    alt={entry.foodItem.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-lg">🍽️</span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground text-sm line-clamp-1">
                    {entry.foodItem.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.quantity} × {entry.foodItem.servingSize}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {entry.foodItem.calories * entry.quantity} kcal
                </span>
                <button 
                  onClick={() => onRemoveEntry(entry.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
        
        <Button 
          variant="outline" 
          className="w-full border-dashed"
          onClick={onAddFood}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Food
        </Button>
      </div>
    </div>
  );
};
