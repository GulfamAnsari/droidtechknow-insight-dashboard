
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const NutritionTracking = () => {
  const [dailyData, setDailyData] = useState({
    consumed: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    targets: { calories: 2000, protein: 150, carbs: 250, fat: 67 }
  });

  useEffect(() => {
    // Load daily data
    const today = new Date().toDateString();
    const meals = localStorage.getItem(`foodTracker2Meals_${today}`);
    const profile = localStorage.getItem('foodTracker2Profile');
    
    if (meals) {
      const mealData = JSON.parse(meals);
      const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      
      mealData.forEach((meal: any) => {
        meal.foods.forEach((food: any) => {
          totals.calories += food.calories;
          totals.protein += food.protein;
          totals.carbs += food.carbs;
          totals.fat += food.fat;
        });
      });
      
      let targets = { calories: 2000, protein: 150, carbs: 250, fat: 67 };
      if (profile) {
        const profileData = JSON.parse(profile);
        targets.calories = profileData.targetCalories;
        targets.protein = Math.round(profileData.targetCalories * 0.25 / 4);
        targets.carbs = Math.round(profileData.targetCalories * 0.5 / 4);
        targets.fat = Math.round(profileData.targetCalories * 0.25 / 9);
      }
      
      setDailyData({ consumed: totals, targets });
    }
  }, []);

  const macroData = [
    { name: 'Protein', value: dailyData.consumed.protein, color: '#3b82f6' },
    { name: 'Carbs', value: dailyData.consumed.carbs, color: '#10b981' },
    { name: 'Fat', value: dailyData.consumed.fat, color: '#f59e0b' },
  ];

  const getProgressColor = (current: number, target: number) => {
    const percentage = (current / target) * 100;
    if (percentage > 100) return 'bg-red-500';
    if (percentage > 80) return 'bg-green-500';
    if (percentage > 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Daily Nutrition Overview</CardTitle>
          <CardDescription>Track your progress towards daily nutrition goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Calories</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(dailyData.consumed.calories)} / {dailyData.targets.calories}
                  </span>
                </div>
                <Progress 
                  value={(dailyData.consumed.calories / dailyData.targets.calories) * 100} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Protein</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(dailyData.consumed.protein)}g / {dailyData.targets.protein}g
                  </span>
                </div>
                <Progress 
                  value={(dailyData.consumed.protein / dailyData.targets.protein) * 100} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Carbs</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(dailyData.consumed.carbs)}g / {dailyData.targets.carbs}g
                  </span>
                </div>
                <Progress 
                  value={(dailyData.consumed.carbs / dailyData.targets.carbs) * 100} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Fat</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(dailyData.consumed.fat)}g / {dailyData.targets.fat}g
                  </span>
                </div>
                <Progress 
                  value={(dailyData.consumed.fat / dailyData.targets.fat) * 100} 
                  className="h-2"
                />
              </div>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {macroData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remaining Nutrients</CardTitle>
          <CardDescription>What you have left for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {Math.max(0, dailyData.targets.calories - dailyData.consumed.calories)}
              </div>
              <div className="text-sm text-muted-foreground">Calories Left</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.max(0, dailyData.targets.protein - dailyData.consumed.protein)}g
              </div>
              <div className="text-sm text-muted-foreground">Protein Left</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Math.max(0, dailyData.targets.carbs - dailyData.consumed.carbs)}g
              </div>
              <div className="text-sm text-muted-foreground">Carbs Left</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {Math.max(0, dailyData.targets.fat - dailyData.consumed.fat)}g
              </div>
              <div className="text-sm text-muted-foreground">Fat Left</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NutritionTracking;
