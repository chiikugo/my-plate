# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Environment Setup (Supabase)

1. Create a `.env` file by copying `.env.example`:

   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase values (these are safe for client use):

   - `EXPO_PUBLIC_SUPABASE_URL` – Project URL from Supabase Dashboard → Settings → API
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` – anon public key from Supabase Dashboard → Settings → API

3. Start the app (Expo automatically loads `EXPO_PUBLIC_*` variables):

   ```bash
   npx expo start
   ```

Notes:

- Do not put your Postgres connection string or service role key in the app. Those are server-side secrets.
- Storage bucket used by this app: `my-plate-bucket`. Ensure it exists and is public or has appropriate read policy.
- Example table used by the Add Recipe page: `test_recipes` with columns `recipe_name`, `ingredients`, `instructions`, `photo_url`.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
