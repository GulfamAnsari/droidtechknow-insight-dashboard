
import { useState } from 'react';
import { useTodo } from '@/contexts/TodoContext';
import httpClient from '@/utils/httpClient';
import { TodoItem } from '@/types/todo';

export const useTodoOperations = () => {
  const { state, dispatch } = useTodo();
  const [isLoading, setIsLoading] = useState(false);

  const createTodo = async (todoData: Partial<TodoItem>) => {
    setIsLoading(true);
    try {
      const response = await httpClient.post('https://droidtechknow.com/admin/api/todo/', todoData);
      
      if (response.success) {
        const newTodo = response.todo;
        dispatch({ type: 'ADD_TODO', payload: newTodo });
        return newTodo;
      } else {
        throw new Error('Failed to create todo');
      }
    } catch (error) {
      console.error('Create todo failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTodo = async (todoId: string, updates: Partial<TodoItem>) => {
    setIsLoading(true);
    try {
      const response = await httpClient.put(`https://droidtechknow.com/admin/api/todo/`, {
        id: todoId,
        ...updates
      });
      
      if (response.success) {
        const updatedTodo = response.todo;
        dispatch({ type: 'UPDATE_TODO', payload: updatedTodo });
        return updatedTodo;
      } else {
        throw new Error('Failed to update todo');
      }
    } catch (error) {
      console.error('Update todo failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTodo = async (todoId: string) => {
    setIsLoading(true);
    try {
      const response = await httpClient.delete('https://droidtechknow.com/admin/api/todo/', {
        id: todoId
      });
      
      if (response.success) {
        dispatch({ type: 'DELETE_TODO', payload: todoId });
      } else {
        throw new Error('Failed to delete todo');
      }
    } catch (error) {
      console.error('Delete todo failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTodoComplete = async (todoId: string) => {
    const todo = state.todos.find(t => t.id === todoId);
    if (!todo) return;

    await updateTodo(todoId, { completed: !todo.completed });
  };

  return {
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodoComplete,
    isLoading
  };
};
