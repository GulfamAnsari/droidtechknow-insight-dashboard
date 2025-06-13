
import { useState } from 'react';
import { useTodo } from '@/contexts/TodoContext';

export const useTodoOperations = () => {
  const { state, dispatch } = useTodo();
  const [isLoading, setIsLoading]= useState(false);

  const createTodo = async (todoData: any) => {
    setIsLoading(true);
    try {
      // Make API call first
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todoData)
      });
      
      if (response.ok) {
        const newTodo = await response.json();
        // Update local state after successful API call
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

  const updateTodo = async (todoId: string, updates: any) => {
    setIsLoading(true);
    try {
      // Make API call first
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        const updatedTodo = await response.json();
        // Update local state after successful API call
        dispatch({ type: 'UPDATE_TODO', payload: { id: todoId, updates: updatedTodo } });
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
      // Make API call first
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Update local state after successful API call
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
