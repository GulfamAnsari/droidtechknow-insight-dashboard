
  const renderTodoItem = (todo: TodoItem) => {
    return (
      <div 
        key={todo.id} 
        className={cn(
          "border-b p-4 cursor-pointer hover:bg-accent/50 transition-colors",
          todo.completed ? "opacity-60" : "",
          selectedTodoId === todo.id ? "bg-accent" : ""
        )}
        onClick={() => {
          setSelectedTodoId(todo.id);
          if (isMobile) {
            onOpenDetails();
          }
        }}
      >
        <div className="flex items-start gap-3">
          <button 
            className={cn(
              "mt-1 flex-shrink-0 h-5 w-5 rounded-full border flex items-center justify-center",
              todo.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
            )}
            onClick={(e) => handleToggleCompleted(todo.id, e)}
            aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
          >
            {todo.completed && <Check className="h-3 w-3" />}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={cn(
                "text-sm font-medium truncate",
                todo.completed ? "line-through text-muted-foreground" : ""
              )}>
                {todo.title}
              </p>
              
              <button
                className={cn(
                  "flex-shrink-0 text-muted-foreground hover:text-amber-500",
                  todo.important ? "text-amber-500" : ""
                )}
                onClick={(e) => handleToggleImportant(todo.id, e)}
                aria-label={todo.important ? "Remove importance" : "Mark as important"}
              >
                {todo.important ? (
                  <Star className="h-5 w-5 fill-amber-500" />
                ) : (
                  <StarOff className="h-5 w-5" />
                )}
              </button>
            </div>
            
            {/* Show steps summary if any */}
            {todo.steps && todo.steps.length > 0 && (
              <div className="mt-1">
                <TodoStepsList 
                  steps={todo.steps} 
                  todoId={todo.id} 
                  readOnly 
                  className="line-clamp-1"
                />
              </div>
            )}
            
            {/* Show notes preview if any */}
            {todo.notes && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{todo.notes}</p>
            )}
            
            {/* Due date and reminder badge */}
            <div className="flex flex-wrap gap-2 mt-2">
              {todo.dueDate && (
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full inline-flex items-center gap-1",
                  new Date(todo.dueDate) < new Date() && !todo.completed 
                    ? "bg-destructive text-destructive-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  <Calendar className="h-3 w-3" />
                  {formatDueDate(todo.dueDate)}
                </span>
              )}
              
              {todo.reminderDate && new Date(todo.reminderDate) > new Date() && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full inline-flex items-center gap-1">
                  <Bell className="h-3 w-3" />
                  {format(new Date(todo.reminderDate), "MMM d, h:mm a")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
