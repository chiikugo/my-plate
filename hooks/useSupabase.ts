import { useEffect, useState } from 'react';
import { Recipe } from '../lib/supabase';
import { SupabaseService } from '../lib/supabaseService';

export const useRecipes = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await SupabaseService.getRecipes();
      setRecipes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recipes');
    } finally {
      setLoading(false);
    }
  };

  const addRecipe = async (recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newRecipe = await SupabaseService.createRecipe(recipe);
      setRecipes(prev => [newRecipe, ...prev]);
      return newRecipe;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add recipe');
      throw err;
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      await SupabaseService.deleteRecipe(id);
      setRecipes(prev => prev.filter(recipe => recipe.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recipe');
      throw err;
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  return {
    recipes,
    loading,
    error,
    refetch: fetchRecipes,
    addRecipe,
    deleteRecipe,
  };
};
