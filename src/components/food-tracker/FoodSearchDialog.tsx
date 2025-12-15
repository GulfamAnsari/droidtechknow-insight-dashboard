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

interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
  serving_size?: string;
  image_small_url?: string;
}

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
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
          searchQuery
        )}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,nutriments,serving_size,image_small_url`
      );
      const data = await response.json();

      const foods: FoodItem[] = (data.products || [])
        .filter(
          (p: OpenFoodFactsProduct) =>
            p.product_name && p.nutriments?.["energy-kcal_100g"]
        )
        .map((p: OpenFoodFactsProduct) => ({
          id: p.code,
          name: p.product_name || "Unknown",
          calories: Math.round(p.nutriments?.["energy-kcal_100g"] || 0),
          protein: Math.round(p.nutriments?.proteins_100g || 0),
          carbs: Math.round(p.nutriments?.carbohydrates_100g || 0),
          fat: Math.round(p.nutriments?.fat_100g || 0),
          servingSize: p.serving_size || "100g",
          imageUrl: p.image_small_url,
        }));

      setResults(foods);
    } catch (error) {
      console.error("Error searching foods:", error);
      toast.error("Failed to search foods");
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
              {results.length > 0 ? (
                <div className="space-y-2">
                  {results.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => setSelectedFood(food)}
                      className="w-full p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left flex items-center gap-3"
                    >
                      {food.imageUrl ? (
                        <img
                          src={food.imageUrl}
                          alt={food.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <span className="text-xl">🍽️</span>
                        </div>
                      )}
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
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Search for foods to add them to your meal
                </p>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {selectedFood.imageUrl ? (
                <img
                  src={selectedFood.imageUrl}
                  alt={selectedFood.name}
                  className="w-20 h-20 rounded-xl object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center">
                  <span className="text-3xl">🍽️</span>
                </div>
              )}
              <div>
                <h3 className="font-semibold text-foreground">{selectedFood.name}</h3>
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
