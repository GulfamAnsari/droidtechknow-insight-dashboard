
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, Plus } from 'lucide-react';

const MealSuggestions = () => {
  const suggestions = [
    {
      name: 'Greek Yogurt with Berries',
      calories: 150,
      protein: 15,
      carbs: 20,
      fat: 2,
      type: 'breakfast'
    },
    {
      name: 'Grilled Chicken Salad',
      calories: 350,
      protein: 35,
      carbs: 15,
      fat: 12,
      type: 'lunch'
    },
    {
      name: 'Salmon with Quinoa',
      calories: 450,
      protein: 40,
      carbs: 35,
      fat: 18,
      type: 'dinner'
    },
    {
      name: 'Apple with Almond Butter',
      calories: 190,
      protein: 6,
      carbs: 25,
      fat: 8,
      type: 'snack'
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Meal Suggestions
          </CardTitle>
          <CardDescription>Smart recommendations based on your remaining daily nutrients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{suggestion.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{suggestion.type}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-medium">{suggestion.calories}</div>
                    <div className="text-muted-foreground">cal</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{suggestion.protein}g</div>
                    <div className="text-muted-foreground">protein</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{suggestion.carbs}g</div>
                    <div className="text-muted-foreground">carbs</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{suggestion.fat}g</div>
                    <div className="text-muted-foreground">fat</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MealSuggestions;
