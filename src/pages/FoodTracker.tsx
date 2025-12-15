import React, { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Settings, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalorieRing } from "@/components/food-tracker/CalorieRing";
import { MacroCard } from "@/components/food-tracker/MacroCard";
import { MealCard } from "@/components/food-tracker/MealCard";
import { FoodSearchDialog } from "@/components/food-tracker/FoodSearchDialog";
import { WeeklyChart } from "@/components/food-tracker/WeeklyChart";
import { GoalsSettingsDialog } from "@/components/food-tracker/GoalsSettingsDialog";
import { useFoodTracker } from "@/components/food-tracker/useFoodTracker";
import type { FoodItem } from "@/components/food-tracker/types";

export default function FoodTracker() {
  const {
    mealEntries,
    goals,
    selectedDate,
    setSelectedDate,
    dailySummary,
    weeklyData,
    addFoodEntry,
    removeFoodEntry,
    updateGoals,
  } = useFoodTracker();

  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState<
    "breakfast" | "lunch" | "dinner" | "snacks"
  >("breakfast");

  const handlePreviousDay = () => {
    const prevDate = subDays(new Date(selectedDate), 1);
    setSelectedDate(format(prevDate, "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
    const nextDate = addDays(new Date(selectedDate), 1);
    const today = new Date();
    if (nextDate <= today) {
      setSelectedDate(format(nextDate, "yyyy-MM-dd"));
    }
  };

  const handleAddFood = (mealType: "breakfast" | "lunch" | "dinner" | "snacks") => {
    setActiveMealType(mealType);
    setSearchDialogOpen(true);
  };

  const handleFoodAdded = (food: FoodItem, quantity: number) => {
    addFoodEntry(food, quantity, activeMealType);
  };

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Food Tracker</h1>
            <p className="text-muted-foreground text-sm">
              Track your daily nutrition
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setGoalsDialogOpen(true)}
          >
            <Target className="w-4 h-4" />
          </Button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" onClick={handlePreviousDay}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {isToday ? "Today" : format(new Date(selectedDate), "EEEE")}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(selectedDate), "MMMM d, yyyy")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextDay}
            disabled={isToday}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Calorie Ring & Macros */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <CalorieRing
              consumed={dailySummary.consumed.calories}
              goal={goals.calories}
              size={180}
            />
            <div className="flex-1 grid grid-cols-3 gap-3 w-full">
              <MacroCard
                label="Protein"
                current={dailySummary.consumed.protein}
                goal={goals.protein}
                color="hsl(142, 76%, 36%)"
              />
              <MacroCard
                label="Carbs"
                current={dailySummary.consumed.carbs}
                goal={goals.carbs}
                color="hsl(45, 93%, 47%)"
              />
              <MacroCard
                label="Fat"
                current={dailySummary.consumed.fat}
                goal={goals.fat}
                color="hsl(280, 65%, 60%)"
              />
            </div>
          </div>
        </div>

        {/* Weekly Chart */}
        <WeeklyChart data={weeklyData} goal={goals.calories} />

        {/* Meals */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Today's Meals</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <MealCard
              mealType="breakfast"
              entries={mealEntries.breakfast}
              onAddFood={() => handleAddFood("breakfast")}
              onRemoveEntry={removeFoodEntry}
            />
            <MealCard
              mealType="lunch"
              entries={mealEntries.lunch}
              onAddFood={() => handleAddFood("lunch")}
              onRemoveEntry={removeFoodEntry}
            />
            <MealCard
              mealType="dinner"
              entries={mealEntries.dinner}
              onAddFood={() => handleAddFood("dinner")}
              onRemoveEntry={removeFoodEntry}
            />
            <MealCard
              mealType="snacks"
              entries={mealEntries.snacks}
              onAddFood={() => handleAddFood("snacks")}
              onRemoveEntry={removeFoodEntry}
            />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <FoodSearchDialog
        open={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        onAddFood={handleFoodAdded}
        mealType={activeMealType}
      />
      <GoalsSettingsDialog
        open={goalsDialogOpen}
        onClose={() => setGoalsDialogOpen(false)}
        goals={goals}
        onSave={updateGoals}
      />
    </div>
  );
}
