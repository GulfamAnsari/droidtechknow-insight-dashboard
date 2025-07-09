
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, Camera } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  quantity: number;
}

interface MealLog {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: FoodItem[];
  timestamp: string;
}

const DailyLogging = () => {
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [isSearching, setIsSearching] = useState(false);
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);

  useEffect(() => {
    // Load meals from localStorage
    const today = new Date().toDateString();
    const savedMeals = localStorage.getItem(`foodTracker2Meals_${today}`);
    if (savedMeals) {
      setMeals(JSON.parse(savedMeals));
    } else {
      // Initialize empty meals for the day
      const initialMeals: MealLog[] = [
        { id: 'breakfast', type: 'breakfast', foods: [], timestamp: new Date().toISOString() },
        { id: 'lunch', type: 'lunch', foods: [], timestamp: new Date().toISOString() },
        { id: 'dinner', type: 'dinner', foods: [], timestamp: new Date().toISOString() },
        { id: 'snack', type: 'snack', foods: [], timestamp: new Date().toISOString() },
      ];
      setMeals(initialMeals);
    }
  }, []);

  const saveMeals = (updatedMeals: MealLog[]) => {
    const today = new Date().toDateString();
    localStorage.setItem(`foodTracker2Meals_${today}`, JSON.stringify(updatedMeals));
    setMeals(updatedMeals);
  };

  const searchFood = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      // Using USDA FoodData Central API (free tier)
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=${encodeURIComponent(query)}&pageSize=10`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.foods || []);
      } else {
        // Fallback to local food database
        const localFoods = [
          { fdcId: 1, description: 'Apple', foodNutrients: [{ nutrientId: 1008, value: 52 }, { nutrientId: 1003, value: 0.3 }, { nutrientId: 1005, value: 14 }, { nutrientId: 1004, value: 0.2 }] },
          { fdcId: 2, description: 'Banana', foodNutrients: [{ nutrientId: 1008, value: 89 }, { nutrientId: 1003, value: 1.1 }, { nutrientId: 1005, value: 23 }, { nutrientId: 1004, value: 0.3 }] },
          { fdcId: 3, description: 'Chicken Breast', foodNutrients: [{ nutrientId: 1008, value: 165 }, { nutrientId: 1003, value: 31 }, { nutrientId: 1005, value: 0 }, { nutrientId: 1004, value: 3.6 }] },
          { fdcId: 4, description: 'Rice', foodNutrients: [{ nutrientId: 1008, value: 130 }, { nutrientId: 1003, value: 2.7 }, { nutrientId: 1005, value: 28 }, { nutrientId: 1004, value: 0.3 }] },
          { fdcId: 5, description: 'Broccoli', foodNutrients: [{ nutrientId: 1008, value: 25 }, { nutrientId: 1003, value: 3 }, { nutrientId: 1005, value: 5 }, { nutrientId: 1004, value: 0.3 }] },
        ];
        
        const filtered = localFoods.filter(food => 
          food.description.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Error searching food:', error);
      toast.error('Failed to search food database');
    } finally {
      setIsSearching(false);
    }
  };

  const addFoodToMeal = (food: any, quantity: number = 1) => {
    const nutrients = food.foodNutrients || [];
    const calories = nutrients.find((n: any) => n.nutrientId === 1008)?.value || 0;
    const protein = nutrients.find((n: any) => n.nutrientId === 1003)?.value || 0;
    const carbs = nutrients.find((n: any) => n.nutrientId === 1005)?.value || 0;
    const fat = nutrients.find((n: any) => n.nutrientId === 1004)?.value || 0;

    const foodItem: FoodItem = {
      id: `${food.fdcId}_${Date.now()}`,
      name: food.description,
      calories: calories * quantity,
      protein: protein * quantity,
      carbs: carbs * quantity,
      fat: fat * quantity,
      serving: '100g',
      quantity,
    };

    const updatedMeals = meals.map(meal => {
      if (meal.type === selectedMeal) {
        return { ...meal, foods: [...meal.foods, foodItem] };
      }
      return meal;
    });

    saveMeals(updatedMeals);
    setIsAddFoodOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    toast.success(`Added ${food.description} to ${selectedMeal}`);
  };

  const removeFoodFromMeal = (mealType: string, foodId: string) => {
    const updatedMeals = meals.map(meal => {
      if (meal.type === mealType) {
        return { ...meal, foods: meal.foods.filter(food => food.id !== foodId) };
      }
      return meal;
    });
    saveMeals(updatedMeals);
    toast.success('Food item removed');
  };

  const getTotalNutrients = () => {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    meals.forEach(meal => {
      meal.foods.forEach(food => {
        totals.calories += food.calories;
        totals.protein += food.protein;
        totals.carbs += food.carbs;
        totals.fat += food.fat;
      });
    });
    return totals;
  };

  const totals = getTotalNutrients();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Daily Summary</CardTitle>
          <CardDescription>Today's nutrition overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-xl font-bold text-primary">{Math.round(totals.calories)}</div>
              <div className="text-xs text-muted-foreground">Calories</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-xl font-bold text-blue-600">{Math.round(totals.protein)}</div>
              <div className="text-xs text-muted-foreground">Protein (g)</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-xl font-bold text-green-600">{Math.round(totals.carbs)}</div>
              <div className="text-xs text-muted-foreground">Carbs (g)</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-xl font-bold text-yellow-600">{Math.round(totals.fat)}</div>
              <div className="text-xs text-muted-foreground">Fat (g)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {meals.map(meal => (
        <Card key={meal.id}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="capitalize">{meal.type}</CardTitle>
              <Dialog open={isAddFoodOpen} onOpenChange={setIsAddFoodOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedMeal(meal.type)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Food
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Food to {selectedMeal}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="search">Search Food</Label>
                      <div className="flex gap-2">
                        <Input
                          id="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search for food..."
                        />
                        <Button 
                          onClick={() => searchFood(searchQuery)}
                          disabled={isSearching}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {searchResults.length > 0 && (
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {searchResults.map(food => (
                          <div key={food.fdcId} className="flex justify-between items-center p-2 border rounded">
                            <span className="text-sm">{food.description}</span>
                            <Button 
                              size="sm"
                              onClick={() => addFoodToMeal(food)}
                            >
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {meal.foods.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No foods logged yet</p>
            ) : (
              <div className="space-y-2">
                {meal.foods.map(food => (
                  <div key={food.id} className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <div className="font-medium">{food.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round(food.calories)} cal, {Math.round(food.protein)}g protein
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFoodFromMeal(meal.type, food.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DailyLogging;
