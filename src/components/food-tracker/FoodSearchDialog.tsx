import React, { useState, useCallback, useEffect } from "react";
import { Search, Plus, Minus, Loader2, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FoodItem } from "./types";
import { toast } from "sonner";
import { FOODS } from "./foods";

interface FoodSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onAddFood: (food: FoodItem, quantity: number) => void;
  mealType: string;
}

interface USDAFood {
  fdcId: number;
  description: string;
  foodNutrients?: {
    nutrientId: number;
    nutrientName: string;
    value: number;
    unitName: string;
  }[];
  servingSize?: number;
  servingSizeUnit?: string;
}

const commonFoods: FoodItem[] = FOODS;

export const FoodSearchDialog: React.FC<FoodSearchDialogProps> = ({
  open,
  onClose,
  onAddFood,
  mealType,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(1);

  /* ================= NEW STATE (IMAGE ML) ================= */
  const [imageLoading, setImageLoading] = useState(false);

  const searchFood = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=${encodeURIComponent(
          searchQuery
        )}&pageSize=15`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.foods?.length) {
          const foods: FoodItem[] = data.foods.slice(0, 15).map((f: USDAFood) => {
            const nutrients = f.foodNutrients || [];
            return {
              id: String(f.fdcId),
              name: f.description,
              calories: Math.round(
                nutrients.find(n => n.nutrientName === "Energy")?.value || 0
              ),
              protein: Math.round(
                nutrients.find(n => n.nutrientName === "Protein")?.value || 0
              ),
              carbs: Math.round(
                nutrients.find(n => n.nutrientName === "Carbohydrate, by difference")?.value || 0
              ),
              fat: Math.round(
                nutrients.find(n => n.nutrientName === "Total lipid (fat)")?.value || 0
              ),
              servingSize: "100g",
            };
          });

          setResults(foods);
          return;
        }
      }

      setResults(
        commonFoods.filter(f =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } catch {
      setResults(
        commonFoods.filter(f =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* ================= NEW: IMAGE → FOOD ML ================= */
  const handleImageUpload = async (file: File) => {
    setImageLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();

      const res = await fetch(
        "https://api-inference.huggingface.co/models/nateraw/food",
        {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: arrayBuffer,
        }
      );

      const predictions = await res.json();

      if (!Array.isArray(predictions) || !predictions[0]?.label) {
        throw new Error("No food detected");
      }

      const foodName = predictions[0].label;
      toast.success(`Detected: ${foodName}`);
      setQuery(foodName);
      searchFood(foodName);
    } catch (err) {
      toast.error("Could not detect food from image");
    } finally {
      setImageLoading(false);
    }
  };

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  useEffect(() => {
    if (query.length < 2) {
      setResults(commonFoods);
    }
  }, [query]);

  const handleAddFood = () => {
    if (!selectedFood) return;
    onAddFood(selectedFood, quantity);
    toast.success(`Added ${selectedFood.name} to ${mealType}`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="capitalize">Add Food to {mealType}</DialogTitle>
        </DialogHeader>

        {!selectedFood ? (
          <>
            {/* SEARCH ROW (UNCHANGED) */}
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search for food..."
              />
              <Button onClick={() => searchFood(query)} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </Button>

              {/* ✅ IMAGE BUTTON (NEW) */}
              <label className="cursor-pointer">
                <input type="file" hidden accept="image/*" onChange={handleImageInput} />
                <Button variant="outline" disabled={imageLoading}>
                  {imageLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                </Button>
              </label>
            </div>

            <ScrollArea className="h-[300px] mt-4">
              {results.map(food => (
                <button
                  key={food.id}
                  onClick={() => setSelectedFood(food)}
                  className="w-full p-3 rounded-xl bg-muted/50 hover:bg-muted text-left"
                >
                  <p className="font-medium">{food.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {food.calories} kcal • {food.servingSize}
                  </p>
                </button>
              ))}
            </ScrollArea>
          </>
        ) : (
          <div className="space-y-6">
            {/* EXISTING SELECTED FOOD UI — UNTOUCHED */}
            <h3 className="font-semibold">{selectedFood.name}</h3>

            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">{selectedFood.calories * quantity} kcal</div>
              <div className="text-center">{selectedFood.protein * quantity}g Protein</div>
              <div className="text-center">{selectedFood.carbs * quantity}g Carbs</div>
              <div className="text-center">{selectedFood.fat * quantity}g Fat</div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus />
              </Button>
              <span>{quantity}</span>
              <Button onClick={() => setQuantity(quantity + 1)}>
                <Plus />
              </Button>
            </div>

            <Button onClick={handleAddFood}>Add to {mealType}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
