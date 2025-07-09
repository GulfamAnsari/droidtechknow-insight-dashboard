
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, UtensilsCrossed, TrendingUp, Camera, Droplets, Timer, Apple } from 'lucide-react';
import ProfileSetup from '@/components/food-tracker/ProfileSetup';
import DailyLogging from '@/components/food-tracker/DailyLogging';
import NutritionTracking from '@/components/food-tracker/NutritionTracking';
import ProgressTracking from '@/components/food-tracker/ProgressTracking';
import PhotoLogging from '@/components/food-tracker/PhotoLogging';
import WaterTracker from '@/components/food-tracker/WaterTracker';
import FastingTimer from '@/components/food-tracker/FastingTimer';
import MealSuggestions from '@/components/food-tracker/MealSuggestions';

const FoodTracker2 = () => {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col inner-container">
      <div className="flex items-center gap-2 p-4 border-b">
        <Apple className="h-6 w-6 text-green-600" />
        <h1 className="text-2xl font-bold">Food Tracker 2</h1>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="logging" className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="hidden sm:inline">Logging</span>
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Nutrition</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Progress</span>
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Photos</span>
            </TabsTrigger>
            <TabsTrigger value="water" className="flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              <span className="hidden sm:inline">Water</span>
            </TabsTrigger>
            <TabsTrigger value="fasting" className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">Fasting</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Apple className="h-4 w-4" />
              <span className="hidden sm:inline">Suggestions</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 h-[calc(100%-4rem)]">
            <TabsContent value="profile" className="h-full">
              <ProfileSetup />
            </TabsContent>
            
            <TabsContent value="logging" className="h-full">
              <DailyLogging />
            </TabsContent>
            
            <TabsContent value="nutrition" className="h-full">
              <NutritionTracking />
            </TabsContent>
            
            <TabsContent value="progress" className="h-full">
              <ProgressTracking />
            </TabsContent>
            
            <TabsContent value="photos" className="h-full">
              <PhotoLogging />
            </TabsContent>
            
            <TabsContent value="water" className="h-full">
              <WaterTracker />
            </TabsContent>
            
            <TabsContent value="fasting" className="h-full">
              <FastingTimer />
            </TabsContent>
            
            <TabsContent value="suggestions" className="h-full">
              <MealSuggestions />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default FoodTracker2;
