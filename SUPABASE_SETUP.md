# Supabase Setup Guide

This guide will help you set up Supabase for your React Native/Expo app.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. Node.js and npm installed
3. Expo CLI installed

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter a project name (e.g., "my-plate")
5. Enter a database password (save this!)
6. Choose a region close to you
7. Click "Create new project"

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy your Project URL and anon/public key
3. You'll need these for the environment variables

## Step 3: Set Up Environment Variables

1. Create a `.env` file in your project root:
```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

2. Replace the placeholder values with your actual Supabase credentials

## Step 4: Create the Database Table

1. In your Supabase dashboard, go to SQL Editor
2. Run the following SQL to create the recipes table:

```sql
-- Create recipes table
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ingredients TEXT NOT NULL,
  instructions TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for now)
CREATE POLICY "Allow all operations" ON recipes FOR ALL USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Step 5: Set Up Storage (Optional)

If you want to store images in Supabase:

1. Go to Storage in your Supabase dashboard
2. Create a new bucket called `recipe-images`
3. Set the bucket to public
4. Update the storage policies:

```sql
-- Allow public access to recipe-images bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'recipe-images');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'recipe-images');
```

## Step 6: Test the Integration

1. Start your Expo app:
```bash
npx expo start
```

2. Try creating a recipe with the camera functionality
3. Check your Supabase dashboard to see if the recipe was saved

## Troubleshooting

### Common Issues

1. **Environment variables not loading**
   - Make sure your `.env` file is in the project root
   - Restart your Expo development server
   - Check that variable names start with `EXPO_PUBLIC_`

2. **Permission denied errors**
   - Check your RLS policies in Supabase
   - Make sure the table exists and has the correct structure

3. **Image upload issues**
   - Verify your storage bucket exists and is public
   - Check storage policies

### Debugging

1. Check the console logs for detailed error messages
2. Use the Supabase dashboard to monitor database activity
3. Test your Supabase connection in the SQL Editor

## Next Steps

1. **Add Authentication**: Implement user authentication with Supabase Auth
2. **Add Real-time Features**: Use Supabase's real-time subscriptions
3. **Add Search**: Implement full-text search for recipes
4. **Add Categories**: Create recipe categories and filtering

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Expo Documentation](https://docs.expo.dev/)
