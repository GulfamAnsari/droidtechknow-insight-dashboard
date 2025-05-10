
import React, { createContext, useContext, useReducer, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { TodoItem, TodoList, TodoFilter } from "@/types/todo";
import { useToast } from "@/components/ui/use-toast";
import httpClient from "@/utils/httpClient";

interface TodoState {
  lists: TodoList[];
  todos: TodoItem[];
  activeListId: string | null;
  filter: TodoFilter;
  isLoading: boolean;
}

type TodoAction =
  | { type: "SET_LISTS"; payload: TodoList[] }
  | { type: "ADD_LIST"; payload: TodoList }
  | { type: "UPDATE_LIST"; payload: TodoList }
  | { type: "DELETE_LIST"; payload: string }
  | { type: "SET_ACTIVE_LIST"; payload: string }
  | { type: "SET_TODOS"; payload: TodoItem[] }
  | { type: "ADD_TODO"; payload: TodoItem }
  | { type: "UPDATE_TODO"; payload: TodoItem }
  | { type: "DELETE_TODO"; payload: string }
  | { type: "TOGGLE_TODO_COMPLETED"; payload: string }
  | { type: "TOGGLE_TODO_IMPORTANT"; payload: string }
  | { type: "SET_FILTER"; payload: TodoFilter }
  | { type: "ADD_TODO_STEP"; payload: { todoId: string, stepTitle: string } }
  | { type: "UPDATE_TODO_STEP"; payload: { todoId: string, stepId: string, title: string } }
  | { type: "TOGGLE_TODO_STEP"; payload: { todoId: string, stepId: string } }
  | { type: "DELETE_TODO_STEP"; payload: { todoId: string, stepId: string } }
  | { type: "SET_LOADING"; payload: boolean };

interface TodoContextType {
  state: TodoState;
  dispatch: React.Dispatch<TodoAction>;
  filteredTodos: TodoItem[];
  getListById: (id: string) => TodoList | undefined;
  getTodoById: (id: string) => TodoItem | undefined;
  fetchTodos: () => Promise<void>;
  fetchLists: () => Promise<void>;
  addTodo: (todo: Omit<TodoItem, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateTodo: (todo: TodoItem) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  toggleTodoCompleted: (id: string) => Promise<void>;
  toggleTodoImportant: (id: string) => Promise<void>;
  addList: (list: Omit<TodoList, "id">) => Promise<void>;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

// Default lists that come with Microsoft ToDo
const defaultLists: TodoList[] = [
  { id: "my-day", name: "My Day", isDefault: true, color: "#058527" },
  { id: "important", name: "Important", isDefault: true, color: "#CA5010" },
  { id: "planned", name: "Planned", isDefault: true, color: "#10CA81" },
  { id: "all", name: "All", isDefault: true, color: "#004E8C" },
  { id: "tasks", name: "Tasks", isDefault: true, color: "#2564CF" },
];

const initialState: TodoState = {
  lists: defaultLists,
  todos: [],
  activeListId: "my-day",
  filter: {},
  isLoading: true,
};

function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case "SET_LISTS":
      return { ...state, lists: action.payload };
    
    case "ADD_LIST": {
      return { ...state, lists: [...state.lists, action.payload] };
    }
    
    case "UPDATE_LIST": {
      const updatedLists = state.lists.map(list => 
        list.id === action.payload.id ? action.payload : list
      );
      return { ...state, lists: updatedLists };
    }
    
    case "DELETE_LIST": {
      // Can't delete default lists
      const listToDelete = state.lists.find(list => list.id === action.payload);
      if (listToDelete?.isDefault) return state;
      
      const updatedLists = state.lists.filter(list => list.id !== action.payload);
      // Remove todos belonging to the deleted list
      const updatedTodos = state.todos.filter(todo => todo.listId !== action.payload);
      
      // If we deleted the active list, switch to "Tasks"
      const newActiveListId = state.activeListId === action.payload ? "tasks" : state.activeListId;
      
      return { 
        ...state, 
        lists: updatedLists,
        todos: updatedTodos,
        activeListId: newActiveListId
      };
    }
    
    case "SET_ACTIVE_LIST":
      return { ...state, activeListId: action.payload };
    
    case "SET_TODOS":
      return { ...state, todos: action.payload };
    
    case "ADD_TODO": {
      return { ...state, todos: [...state.todos, action.payload] };
    }
    
    case "UPDATE_TODO": {
      const updatedTodos = state.todos.map(todo => 
        todo.id === action.payload.id ? action.payload : todo
      );
      return { ...state, todos: updatedTodos };
    }
    
    case "DELETE_TODO": {
      const updatedTodos = state.todos.filter(todo => todo.id !== action.payload);
      return { ...state, todos: updatedTodos };
    }
    
    case "TOGGLE_TODO_COMPLETED": {
      const updatedTodos = state.todos.map(todo => 
        todo.id === action.payload 
          ? { ...todo, completed: !todo.completed, updatedAt: new Date() } 
          : todo
      );
      return { ...state, todos: updatedTodos };
    }
    
    case "TOGGLE_TODO_IMPORTANT": {
      const updatedTodos = state.todos.map(todo => 
        todo.id === action.payload 
          ? { ...todo, important: !todo.important, updatedAt: new Date() } 
          : todo
      );
      return { ...state, todos: updatedTodos };
    }
    
    case "SET_FILTER":
      return { ...state, filter: action.payload };
    
    case "ADD_TODO_STEP": {
      const { todoId, stepTitle } = action.payload;
      const updatedTodos = state.todos.map(todo => {
        if (todo.id === todoId) {
          const newStep = { id: uuidv4(), title: stepTitle, completed: false };
          const steps = [...(todo.steps || []), newStep];
          return { ...todo, steps, updatedAt: new Date() };
        }
        return todo;
      });
      return { ...state, todos: updatedTodos };
    }
    
    case "UPDATE_TODO_STEP": {
      const { todoId, stepId, title } = action.payload;
      const updatedTodos = state.todos.map(todo => {
        if (todo.id === todoId && todo.steps) {
          const updatedSteps = todo.steps.map(step => 
            step.id === stepId ? { ...step, title } : step
          );
          return { ...todo, steps: updatedSteps, updatedAt: new Date() };
        }
        return todo;
      });
      return { ...state, todos: updatedTodos };
    }
    
    case "TOGGLE_TODO_STEP": {
      const { todoId, stepId } = action.payload;
      const updatedTodos = state.todos.map(todo => {
        if (todo.id === todoId && todo.steps) {
          const updatedSteps = todo.steps.map(step => 
            step.id === stepId ? { ...step, completed: !step.completed } : step
          );
          return { ...todo, steps: updatedSteps, updatedAt: new Date() };
        }
        return todo;
      });
      return { ...state, todos: updatedTodos };
    }
    
    case "DELETE_TODO_STEP": {
      const { todoId, stepId } = action.payload;
      const updatedTodos = state.todos.map(todo => {
        if (todo.id === todoId && todo.steps) {
          const updatedSteps = todo.steps.filter(step => step.id !== stepId);
          return { ...todo, steps: updatedSteps, updatedAt: new Date() };
        }
        return todo;
      });
      return { ...state, todos: updatedTodos };
    }

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    
    default:
      return state;
  }
}

export const TodoProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(todoReducer, initialState);
  const { toast } = useToast();

  // API Functions
  const fetchTodos = async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await httpClient.get("https://droidtechknow.com/admin/api/todo/");
      
      if (response.todos) {
        // Convert string dates to Date objects
        const processedTodos = response.todos.map((todo: any) => ({
          ...todo,
          createdAt: new Date(todo.createdAt),
          updatedAt: new Date(todo.updatedAt),
          dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
          reminderDate: todo.reminderDate ? new Date(todo.reminderDate) : null,
        }));
        
        dispatch({ type: "SET_TODOS", payload: processedTodos });
      }
    } catch (error) {
      console.error("Error fetching todos:", error);
      toast({
        title: "Error",
        description: "Failed to load your tasks",
        variant: "destructive",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const fetchLists = async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await httpClient.get("https://droidtechknow.com/admin/api/todo/");
      
      if (response.lists) {
        // Merge with default lists to ensure we always have defaults
        const customLists = response.lists.filter((list: TodoList) => !list.isDefault);
        const mergedLists = [...defaultLists, ...customLists];
        dispatch({ type: "SET_LISTS", payload: mergedLists });
      }
    } catch (error) {
      console.error("Error fetching todo lists:", error);
      toast({
        title: "Error",
        description: "Failed to load your task lists",
        variant: "destructive",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const addTodo = async (todoData: Omit<TodoItem, "id" | "createdAt" | "updatedAt">) => {
    try {
      const response = await httpClient.post("https://droidtechknow.com/admin/api/todo/add-todo-item", todoData);
      
      if (response.todo) {
        const newTodo: TodoItem = {
          ...response.todo,
          createdAt: new Date(response.todo.createdAt),
          updatedAt: new Date(response.todo.updatedAt),
          dueDate: response.todo.dueDate ? new Date(response.todo.dueDate) : null,
          reminderDate: response.todo.reminderDate ? new Date(response.todo.reminderDate) : null,
        };
        
        dispatch({ type: "ADD_TODO", payload: newTodo });
        
        toast({
          title: "Success",
          description: "Task added successfully",
        });
      }
    } catch (error) {
      console.error("Error adding todo:", error);
      toast({
        title: "Error",
        description: "Failed to add task",
        variant: "destructive",
      });
    }
  };

  const updateTodo = async (todo: TodoItem) => {
    try {
      await httpClient.post("https://droidtechknow.com/admin/api/todo/update-todo-item", todo);
      
      dispatch({ 
        type: "UPDATE_TODO", 
        payload: {
          ...todo,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error("Error updating todo:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await httpClient.post("https://droidtechknow.com/admin/api/todo/delete-todo-item", { id });
      
      dispatch({ type: "DELETE_TODO", payload: id });
      
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting todo:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const toggleTodoCompleted = async (id: string) => {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;
    
    try {
      const updatedTodo = { ...todo, completed: !todo.completed, updatedAt: new Date() };
      await httpClient.post("https://droidtechknow.com/admin/api/todo/update-todo-item", updatedTodo);
      
      dispatch({ type: "TOGGLE_TODO_COMPLETED", payload: id });
    } catch (error) {
      console.error("Error toggling todo completion:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const toggleTodoImportant = async (id: string) => {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;
    
    try {
      const updatedTodo = { ...todo, important: !todo.important, updatedAt: new Date() };
      await httpClient.post("https://droidtechknow.com/admin/api/todo/update-todo-item", updatedTodo);
      
      dispatch({ type: "TOGGLE_TODO_IMPORTANT", payload: id });
    } catch (error) {
      console.error("Error toggling todo importance:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const addList = async (listData: Omit<TodoList, "id">) => {
    try {
      const response = await httpClient.post("https://droidtechknow.com/admin/api/todo/add-todo-list", listData);
      
      if (response.list) {
        dispatch({ type: "ADD_LIST", payload: response.list });
        
        toast({
          title: "Success",
          description: "List added successfully",
        });
      }
    } catch (error) {
      console.error("Error adding list:", error);
      toast({
        title: "Error",
        description: "Failed to add list",
        variant: "destructive",
      });
    }
  };

  // Load data from API when component mounts
  useEffect(() => {
    const savedActiveListId = localStorage.getItem("activeListId");
    if (savedActiveListId) {
      dispatch({ type: "SET_ACTIVE_LIST", payload: savedActiveListId });
    }
    
    // Fetch todos and lists from API
    fetchTodos();
    fetchLists();
  }, []);

  // Save activeListId to localStorage when it changes
  useEffect(() => {
    if (state.activeListId) {
      localStorage.setItem("activeListId", state.activeListId);
    }
  }, [state.activeListId]);

  // Filter todos based on the active list and filter criteria
  const filteredTodos = React.useMemo(() => {
    if (!state.activeListId) return [];

    let filtered = [...state.todos];

    // Filter by active list
    if (state.activeListId === "my-day") {
      // My Day - check if the due date is today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(todo => {
        if (todo.dueDate) {
          const dueDate = new Date(todo.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() === today.getTime();
        }
        return false;
      });
    } else if (state.activeListId === "important") {
      // Important - show only important todos
      filtered = filtered.filter(todo => todo.important);
    } else if (state.activeListId === "planned") {
      // Planned - show todos with due dates
      filtered = filtered.filter(todo => todo.dueDate !== null && todo.dueDate !== undefined);
    } else if (state.activeListId === "all") {
      // All - show all todos
      // No additional filtering needed
    } else if (state.activeListId !== "tasks") {
      // Specific list - filter by listId
      filtered = filtered.filter(todo => todo.listId === state.activeListId);
    }

    // Apply additional filters
    if (state.filter.completed !== undefined) {
      filtered = filtered.filter(todo => todo.completed === state.filter.completed);
    }

    if (state.filter.important !== undefined) {
      filtered = filtered.filter(todo => todo.important === state.filter.important);
    }

    if (state.filter.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (state.filter.dueDate === 'today') {
        filtered = filtered.filter(todo => {
          if (todo.dueDate) {
            const dueDate = new Date(todo.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === today.getTime();
          }
          return false;
        });
      } else if (state.filter.dueDate === 'tomorrow') {
        filtered = filtered.filter(todo => {
          if (todo.dueDate) {
            const dueDate = new Date(todo.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === tomorrow.getTime();
          }
          return false;
        });
      } else if (state.filter.dueDate === 'upcoming') {
        filtered = filtered.filter(todo => {
          if (todo.dueDate) {
            const dueDate = new Date(todo.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() > today.getTime();
          }
          return false;
        });
      }
    }

    if (state.filter.searchTerm) {
      const searchLower = state.filter.searchTerm.toLowerCase();
      filtered = filtered.filter(todo => 
        todo.title.toLowerCase().includes(searchLower) || 
        (todo.notes && todo.notes.toLowerCase().includes(searchLower))
      );
    }

    // Sort by completed (incomplete first), then by due date, then by created date
    filtered.sort((a, b) => {
      // Completed items go to the bottom
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      // Sort by due date if available
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (a.dueDate) {
        return -1;
      } else if (b.dueDate) {
        return 1;
      }
      
      // Sort by created date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return filtered;
  }, [state.todos, state.activeListId, state.filter]);

  const getListById = (id: string) => {
    return state.lists.find(list => list.id === id);
  };

  const getTodoById = (id: string) => {
    return state.todos.find(todo => todo.id === id);
  };

  return (
    <TodoContext.Provider value={{ 
      state, 
      dispatch, 
      filteredTodos, 
      getListById, 
      getTodoById,
      fetchTodos,
      fetchLists,
      addTodo,
      updateTodo,
      deleteTodo,
      toggleTodoCompleted,
      toggleTodoImportant,
      addList
    }}>
      {children}
    </TodoContext.Provider>
  );
};

export const useTodo = () => {
  const context = useContext(TodoContext);
  if (context === undefined) {
    throw new Error("useTodo must be used within a TodoProvider");
  }
  return context;
};
