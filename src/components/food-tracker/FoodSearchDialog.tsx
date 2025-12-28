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

// Common foods database as fallback
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

            const filtered = commonFoods.filter(f => 
              f.name.toLowerCase().includes(searchQuery.toLowerCase())
            );

          setResults([...filtered, ...foods]);
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
  const displayResults = results.length > 0 ? results : (query.length < 2 ? commonFoods : []);

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
