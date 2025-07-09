
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Droplets, Plus, Minus } from 'lucide-react';

const WaterTracker = () => {
  const [waterIntake, setWaterIntake] = useState(0);
  const [dailyGoal] = useState(2000); // 2 liters in ml

  useEffect(() => {
    const today = new Date().toDateString();
    const savedWater = localStorage.getItem(`waterIntake_${today}`);
    if (savedWater) {
      setWaterIntake(parseInt(savedWater));
    }
  }, []);

  const updateWaterIntake = (amount: number) => {
    const newIntake = Math.max(0, waterIntake + amount);
    setWaterIntake(newIntake);
    const today = new Date().toDateString();
    localStorage.setItem(`waterIntake_${today}`, newIntake.toString());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            Water Intake Tracker
          </CardTitle>
          <CardDescription>Stay hydrated throughout the day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {waterIntake} ml
              </div>
              <div className="text-muted-foreground">
                of {dailyGoal} ml daily goal
              </div>
            </div>
            
            <Progress value={(waterIntake / dailyGoal) * 100} className="h-4" />
            
            <div className="flex justify-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => updateWaterIntake(-250)}
                className="gap-2"
              >
                <Minus className="h-4 w-4" />
                250ml
              </Button>
              <Button 
                onClick={() => updateWaterIntake(250)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                250ml
              </Button>
              <Button 
                onClick={() => updateWaterIntake(500)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                500ml
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WaterTracker;
