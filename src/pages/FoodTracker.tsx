import React, { useState } from "react";
import { format, addDays, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Target, CalendarDays, BarChart3, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalorieRing } from "@/components/food-tracker/CalorieRing";
import { MacroCard } from "@/components/food-tracker/MacroCard";
import { MealCard } from "@/components/food-tracker/MealCard";
import { FoodSearchDialog } from "@/components/food-tracker/FoodSearchDialog";
import { WeeklyChart } from "@/components/food-tracker/WeeklyChart";
import { GoalsSettingsDialog } from "@/components/food-tracker/GoalsSettingsDialog";
import { CalendarView } from "@/components/food-tracker/CalendarView";
import { InsightsPanel } from "@/components/food-tracker/InsightsPanel";
import { useFoodTracker } from "@/components/food-tracker/useFoodTracker";
import type { FoodItem } from "@/components/food-tracker/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FoodTracker() {
  const {
    entries,
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [insightRange, setInsightRange] = useState<"week" | "month" | "all">("week");

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

  // Calculate insight date range
  const getInsightDateRange = () => {
    const today = new Date();
    switch (insightRange) {
      case "week":
        return {
          start: format(startOfWeek(today), "yyyy-MM-dd"),
          end: format(endOfWeek(today), "yyyy-MM-dd"),
        };
      case "month":
        return {
          start: format(startOfMonth(today), "yyyy-MM-dd"),
          end: format(endOfMonth(today), "yyyy-MM-dd"),
        };
      case "all":
        const oldestEntry = entries.length > 0
          ? entries.reduce((oldest, e) => (e.date < oldest ? e.date : oldest), entries[0].date)
          : format(today, "yyyy-MM-dd");
        return {
          start: oldestEntry,
          end: format(today, "yyyy-MM-dd"),
        };
    }
  };

  const insightDates = getInsightDateRange();

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

        {/* Tabs */}
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today" className="gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              <span className="hidden sm:inline">Today</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
          </TabsList>

          {/* Today Tab */}
          <TabsContent value="today" className="space-y-6 mt-6">
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
              <h2 className="text-lg font-semibold text-foreground">
                {isToday ? "Today's Meals" : format(new Date(selectedDate), "EEEE's Meals")}
              </h2>
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
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6 mt-6">
            <CalendarView
              entries={entries}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              calorieGoal={goals.calories}
            />

            {/* Selected Day Summary */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">
                  {format(new Date(selectedDate), "EEEE, MMMM d")}
                </h3>
                <span className="text-sm text-muted-foreground">
                  {dailySummary.consumed.calories} / {goals.calories} kcal
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded-xl">
                  <p className="text-lg font-bold text-foreground">
                    {dailySummary.consumed.calories}
                  </p>
                  <p className="text-xs text-muted-foreground">Calories</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-xl">
                  <p className="text-lg font-bold text-foreground">
                    {dailySummary.consumed.protein}g
                  </p>
                  <p className="text-xs text-muted-foreground">Protein</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-xl">
                  <p className="text-lg font-bold text-foreground">
                    {dailySummary.consumed.carbs}g
                  </p>
                  <p className="text-xs text-muted-foreground">Carbs</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-xl">
                  <p className="text-lg font-bold text-foreground">
                    {dailySummary.consumed.fat}g
                  </p>
                  <p className="text-xs text-muted-foreground">Fat</p>
                </div>
              </div>

              {mealEntries.breakfast.length + mealEntries.lunch.length + 
               mealEntries.dinner.length + mealEntries.snacks.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">Logged Items</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {[...mealEntries.breakfast, ...mealEntries.lunch, 
                      ...mealEntries.dinner, ...mealEntries.snacks].map((entry) => (
                      <div key={entry.id} className="flex justify-between text-sm p-2 bg-muted/30 rounded-lg">
                        <span className="text-foreground line-clamp-1">{entry.foodItem.name}</span>
                        <span className="text-muted-foreground">{entry.foodItem.calories * entry.quantity} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Nutrition Insights</h2>
              <Select value={insightRange} onValueChange={(v) => setInsightRange(v as "week" | "month" | "all")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <InsightsPanel
              entries={entries}
              startDate={insightDates.start}
              endDate={insightDates.end}
              goals={goals}
            />
          </TabsContent>
        </Tabs>
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
