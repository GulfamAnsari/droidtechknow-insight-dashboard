
<CalendarComponent
  mode="single"
  selected={todo.dueDate ? new Date(todo.dueDate) : undefined}
  onSelect={handleSetDueDate}
  initialFocus
  className="pointer-events-auto"
/>
