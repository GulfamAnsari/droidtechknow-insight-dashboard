import React, { useState, useCallback } from "react";
import { Search, Plus, Minus, Loader2 } from "lucide-react";
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

// Common foods database as fallback
const commonFoods: FoodItem[] = [
  { id: "1", name: "Banana", calories: 89, protein: 1, carbs: 23, fat: 0, servingSize: "100g" },
  { id: "2", name: "Apple", calories: 52, protein: 0, carbs: 14, fat: 0, servingSize: "100g" },
  { id: "3", name: "Chicken Breast", calories: 165, protein: 31, carbs: 0, fat: 4, servingSize: "100g" },
  { id: "4", name: "Rice (cooked)", calories: 130, protein: 3, carbs: 28, fat: 0, servingSize: "100g" },
  { id: "5", name: "Egg", calories: 155, protein: 13, carbs: 1, fat: 11, servingSize: "100g" },
  { id: "6", name: "Bread (white)", calories: 265, protein: 9, carbs: 49, fat: 3, servingSize: "100g" },
  { id: "7", name: "Milk (whole)", calories: 61, protein: 3, carbs: 5, fat: 3, servingSize: "100ml" },
  { id: "8", name: "Salmon", calories: 208, protein: 20, carbs: 0, fat: 13, servingSize: "100g" },
  { id: "9", name: "Broccoli", calories: 34, protein: 3, carbs: 7, fat: 0, servingSize: "100g" },
  { id: "10", name: "Pasta (cooked)", calories: 131, protein: 5, carbs: 25, fat: 1, servingSize: "100g" },
  { id: "11", name: "Oatmeal", calories: 68, protein: 2, carbs: 12, fat: 1, servingSize: "100g" },
  { id: "12", name: "Greek Yogurt", calories: 59, protein: 10, carbs: 4, fat: 0, servingSize: "100g" },
  { id: "13", name: "Almonds", calories: 579, protein: 21, carbs: 22, fat: 50, servingSize: "100g" },
  { id: "14", name: "Orange", calories: 47, protein: 1, carbs: 12, fat: 0, servingSize: "100g" },
  { id: "15", name: "Potato (baked)", calories: 93, protein: 2, carbs: 21, fat: 0, servingSize: "100g" },
  { id: "16", name: "Beef (ground)", calories: 250, protein: 26, carbs: 0, fat: 15, servingSize: "100g" },
  { id: "17", name: "Cheese (cheddar)", calories: 403, protein: 25, carbs: 1, fat: 33, servingSize: "100g" },
  { id: "18", name: "Avocado", calories: 160, protein: 2, carbs: 9, fat: 15, servingSize: "100g" },
  { id: "19", name: "Toast with butter", calories: 313, protein: 6, carbs: 41, fat: 14, servingSize: "2 slices" },
  { id: "20", name: "Coffee with milk", calories: 30, protein: 1, carbs: 3, fat: 1, servingSize: "1 cup" },
];

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

  const searchFood = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Try USDA API first
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=${encodeURIComponent(
          searchQuery
        )}&pageSize=15&dataType=Foundation,SR Legacy`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.foods && data.foods.length > 0) {
          const foods: FoodItem[] = data.foods
            .filter((f: USDAFood) => f.description && f.foodNutrients)
            .slice(0, 15)
            .map((f: USDAFood) => {
              const nutrients = f.foodNutrients || [];
              const calories = nutrients.find(n => n.nutrientName === "Energy")?.value || 0;
              const protein = nutrients.find(n => n.nutrientName === "Protein")?.value || 0;
              const carbs = nutrients.find(n => n.nutrientName === "Carbohydrate, by difference")?.value || 0;
              const fat = nutrients.find(n => n.nutrientName === "Total lipid (fat)")?.value || 0;

              return {
                id: String(f.fdcId),
                name: f.description,
                calories: Math.round(calories),
                protein: Math.round(protein),
                carbs: Math.round(carbs),
                fat: Math.round(fat),
                servingSize: f.servingSize ? `${f.servingSize}${f.servingSizeUnit || 'g'}` : "100g",
              };
            });

          setResults(foods);
          return;
        }
      }
      
      // Fallback to local database
      const filtered = commonFoods.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setResults(filtered);
      
    } catch (error) {
      console.error("Error searching foods:", error);
      // Fallback to local database on error
      const filtered = commonFoods.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setResults(filtered);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchFood(query);
  };

  const handleAddFood = () => {
    if (selectedFood) {
      onAddFood(selectedFood, quantity);
      setSelectedFood(null);
      setQuantity(1);
      setQuery("");
      setResults([]);
      onClose();
      toast.success(`Added ${selectedFood.name} to ${mealType}`);
    }
  };

  const handleClose = () => {
    setSelectedFood(null);
    setQuantity(1);
    setQuery("");
    setResults([]);
    onClose();
  };

  // Show common foods when dialog opens
  const displayResults = results.length > 0 ? results : (query.length < 2 ? commonFoods.slice(0, 10) : []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="capitalize">Add Food to {mealType}</DialogTitle>
        </DialogHeader>

        {!selectedFood ? (
          <>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for food..."
                  className="pl-9"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </Button>
            </form>

            <ScrollArea className="h-[300px] mt-4">
              {displayResults.length > 0 ? (
                <div className="space-y-2">
                  {query.length < 2 && results.length === 0 && (
                    <p className="text-xs text-muted-foreground mb-2">Popular foods</p>
                  )}
                  {displayResults.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => setSelectedFood(food)}
                      className="w-full p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-lg">🍽️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm line-clamp-1">
                          {food.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {food.calories} kcal • {food.servingSize}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : query.length >= 2 && !loading ? (
                <p className="text-center text-muted-foreground py-8">
                  No foods found. Try a different search term.
                </p>
              ) : null}
            </ScrollArea>
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-2xl">🍽️</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground line-clamp-2">{selectedFood.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedFood.servingSize}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-3 bg-muted/50 rounded-xl">
                <p className="text-lg font-bold text-foreground">
                  {selectedFood.calories * quantity}
                </p>
                <p className="text-xs text-muted-foreground">kcal</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-xl">
                <p className="text-lg font-bold text-foreground">
                  {selectedFood.protein * quantity}g
                </p>
                <p className="text-xs text-muted-foreground">Protein</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-xl">
                <p className="text-lg font-bold text-foreground">
                  {selectedFood.carbs * quantity}g
                </p>
                <p className="text-xs text-muted-foreground">Carbs</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-xl">
                <p className="text-lg font-bold text-foreground">
                  {selectedFood.fat * quantity}g
                </p>
                <p className="text-xs text-muted-foreground">Fat</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedFood(null)}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleAddFood}>
                Add to {mealType}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
