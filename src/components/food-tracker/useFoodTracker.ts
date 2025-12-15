import { useState, useEffect, useMemo } from "react";
import { format, subDays } from "date-fns";
import type { MealEntry, DailyGoals, FoodItem } from "./types";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY_ENTRIES = "food-tracker-entries";
const STORAGE_KEY_GOALS = "food-tracker-goals";

const defaultGoals: DailyGoals = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
};

export function useFoodTracker() {
  const [entries, setEntries] = useState<MealEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ENTRIES);
    return saved ? JSON.parse(saved) : [];
  });

  const [goals, setGoals] = useState<DailyGoals>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_GOALS);
    return saved ? JSON.parse(saved) : defaultGoals;
  });

  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Persist entries
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
  }, [entries]);

  // Persist goals
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(goals));
  }, [goals]);

  // Filter entries by selected date
  const todayEntries = useMemo(() => {
    return entries.filter((e) => e.date === selectedDate);
  }, [entries, selectedDate]);

  // Group entries by meal type
  const mealEntries = useMemo(() => {
    return {
      breakfast: todayEntries.filter((e) => e.mealType === "breakfast"),
      lunch: todayEntries.filter((e) => e.mealType === "lunch"),
      dinner: todayEntries.filter((e) => e.mealType === "dinner"),
      snacks: todayEntries.filter((e) => e.mealType === "snacks"),
    };
  }, [todayEntries]);

  // Calculate daily summary
  const dailySummary = useMemo(() => {
    const consumed = todayEntries.reduce(
      (acc, entry) => ({
        calories: acc.calories + entry.foodItem.calories * entry.quantity,
        protein: acc.protein + entry.foodItem.protein * entry.quantity,
        carbs: acc.carbs + entry.foodItem.carbs * entry.quantity,
        fat: acc.fat + entry.foodItem.fat * entry.quantity,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return {
      consumed,
      remaining: {
        calories: goals.calories - consumed.calories,
        protein: goals.protein - consumed.protein,
        carbs: goals.carbs - consumed.carbs,
        fat: goals.fat - consumed.fat,
      },
    };
  }, [todayEntries, goals]);

  // Weekly data for chart
  const weeklyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
      const dayEntries = entries.filter((e) => e.date === date);
      const calories = dayEntries.reduce(
        (sum, e) => sum + e.foodItem.calories * e.quantity,
        0
      );
      return { date, calories };
    });
  }, [entries]);

  // Add food entry
  const addFoodEntry = (
    foodItem: FoodItem,
    quantity: number,
    mealType: "breakfast" | "lunch" | "dinner" | "snacks"
  ) => {
    const newEntry: MealEntry = {
      id: uuidv4(),
      foodItem,
      quantity,
      mealType,
      date: selectedDate,
    };
    setEntries((prev) => [...prev, newEntry]);
  };

  // Remove food entry
  const removeFoodEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  // Update goals
  const updateGoals = (newGoals: DailyGoals) => {
    setGoals(newGoals);
  };

  return {
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
  };
}
