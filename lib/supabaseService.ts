import { Recipe, supabase } from './supabase';

export class SupabaseService {
  // Get all recipes
  static async getRecipes(): Promise<Recipe[]> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recipes:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRecipes:', error);
      throw error;
    }
  }

  // Get a single recipe by ID
  static async getRecipe(id: string): Promise<Recipe | null> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching recipe:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getRecipe:', error);
      throw error;
    }
  }

  // Create a new recipe
  static async createRecipe(recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>): Promise<Recipe> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .insert([recipe])
        .select()
        .single();

      if (error) {
        console.error('Error creating recipe:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createRecipe:', error);
      throw error;
    }
  }

  // Update an existing recipe
  static async updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating recipe:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateRecipe:', error);
      throw error;
    }
  }

  // Delete a recipe
  static async deleteRecipe(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting recipe:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteRecipe:', error);
      throw error;
    }
  }

  // Upload image to Supabase storage
  // lib/supabaseService.ts
// ...existing imports and class...

  // Upload image to Supabase storage
  // Enhanced uploadImage method with detailed logging
static async uploadImage(file: File | Blob, fileName: string): Promise<string> {
  try {
    console.log('🔄 [SUPABASE] Starting upload process...');
    console.log('📁 [SUPABASE] File info:', {
      fileName,
      fileSize: file.size,
      fileType: (file as any)?.type || 'unknown'
    });

    // Check authentication status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 [AUTH] User status:', user ? `Authenticated: ${user.email}` : 'Anonymous');
    if (authError) console.log('⚠️ [AUTH] Auth error:', authError);

    const fileExt = fileName.split('.').pop() || 'bin';
    const filePath = `${Date.now()}.${fileExt}`;
    const contentType =
      (file as any)?.type ||
      (fileExt === 'png' ? 'image/png' :
       fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' :
       'application/octet-stream');

    console.log('📋 [UPLOAD] Upload details:', {
      filePath,
      contentType,
      bucket: 'my-plate-bucket'
    });

    const { data, error } = await supabase.storage
      .from('my-plate-bucket')
      .upload(filePath, file, { contentType, upsert: true });

    if (error) {
      console.error('❌ [UPLOAD] Upload failed:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error
      });
      throw error;
    }

    console.log('✅ [UPLOAD] Upload successful:', data);

    const { data: urlData } = supabase.storage
      .from('my-plate-bucket')
      .getPublicUrl(filePath);

    console.log('🔗 [URL] Public URL generated:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('❌ [ERROR] Error in uploadImage:', error);
    throw error;
  }
}

  // List files in the bucket (works in Expo Go)
  static async listBucketFiles(prefix = '', limit = 20): Promise<string[]> {
    const { data, error } = await supabase.storage
      .from('my-plate-bucket')
      .list(prefix, { limit, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      console.error('Error listing bucket files:', error);
      throw error;
    }
    return (data || []).map((f) => f.name);
  }
// ...end of class...
}
