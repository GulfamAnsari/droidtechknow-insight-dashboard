import React, { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isFuture } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MealEntry } from "./types";

interface CalendarViewProps {
  entries: MealEntry[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  calorieGoal: number;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  entries,
  selectedDate,
  onSelectDate,
  currentMonth,
  onMonthChange,
  calorieGoal,
}) => {
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getDayData = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const dayEntries = entries.filter((e) => e.date === dateStr);
    const calories = dayEntries.reduce(
      (sum, e) => sum + e.foodItem.calories * e.quantity,
      0
    );
    return { calories, hasData: dayEntries.length > 0 };
  };

  const getColorClass = (calories: number, hasData: boolean) => {
    if (!hasData) return "bg-transparent";
    const percentage = (calories / calorieGoal) * 100;
    if (percentage > 110) return "bg-destructive/60";
    if (percentage > 90) return "bg-green-500/60";
    if (percentage > 50) return "bg-yellow-500/60";
    return "bg-primary/30";
  };

  const handlePrevMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    onMonthChange(prevMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    if (nextMonth <= new Date()) {
      onMonthChange(nextMonth);
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const firstDayOfMonth = days[0].getDay();

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-semibold text-foreground">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleNextMonth}
          disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const { calories, hasData } = getDayData(day);
          const isSelected = dateStr === selectedDate;
          const isTodayDate = isToday(day);
          const isFutureDate = isFuture(day);

          return (
            <button
              key={dateStr}
              onClick={() => !isFutureDate && onSelectDate(dateStr)}
              disabled={isFutureDate}
              className={`
                aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative
                transition-all duration-200
                ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
                ${isTodayDate ? "font-bold" : ""}
                ${isFutureDate ? "opacity-30 cursor-not-allowed" : "hover:bg-muted cursor-pointer"}
                ${getColorClass(calories, hasData)}
              `}
            >
              <span className={`${isSelected ? "text-foreground" : isTodayDate ? "text-primary" : "text-foreground"}`}>
                {format(day, "d")}
              </span>
              {hasData && (
                <span className="text-[9px] text-muted-foreground">{calories}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500/60" />
          <span>On target</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500/60" />
          <span>Under</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-destructive/60" />
          <span>Over</span>
        </div>
      </div>
    </div>
  );
};
