import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { DailyGoals } from "./types";

interface GoalsSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  goals: DailyGoals;
  onSave: (goals: DailyGoals) => void;
}

export const GoalsSettingsDialog: React.FC<GoalsSettingsDialogProps> = ({
  open,
  onClose,
  goals,
  onSave,
}) => {
  const [localGoals, setLocalGoals] = useState(goals);

  const handleSave = () => {
    onSave(localGoals);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Set Daily Goals</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="calories">Daily Calories (kcal)</Label>
            <Input
              id="calories"
              type="number"
              value={localGoals.calories}
              onChange={(e) =>
                setLocalGoals({ ...localGoals, calories: parseInt(e.target.value) || 0 })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="protein">Protein (g)</Label>
            <Input
              id="protein"
              type="number"
              value={localGoals.protein}
              onChange={(e) =>
                setLocalGoals({ ...localGoals, protein: parseInt(e.target.value) || 0 })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="carbs">Carbohydrates (g)</Label>
            <Input
              id="carbs"
              type="number"
              value={localGoals.carbs}
              onChange={(e) =>
                setLocalGoals({ ...localGoals, carbs: parseInt(e.target.value) || 0 })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fat">Fat (g)</Label>
            <Input
              id="fat"
              type="number"
              value={localGoals.fat}
              onChange={(e) =>
                setLocalGoals({ ...localGoals, fat: parseInt(e.target.value) || 0 })
              }
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              Save Goals
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
