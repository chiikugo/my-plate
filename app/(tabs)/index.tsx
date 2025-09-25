import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from 'react';
import { SupabaseService } from '../../lib/supabaseService';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [recipes, setRecipes] = useState<Array<{ id?: string; recipe_name: string; photo_url: string; ingredients: string; instructions: string; created_at?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await SupabaseService.getTestRecipes(20);
        console.log('[HOME] Loaded recipes:', data?.length ?? 0);
        if (data && data.length > 0) {
          console.log('[HOME] First few photo URLs:', data.slice(0, 3).map(r => r.photo_url));
        }
        if (mounted) setRecipes(data);
      } catch (e: any) {
        console.error('Error loading recipes:', e);
        if (mounted) setError(e?.message || 'Failed to load recipes');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#eee' }]}>
        <Text style={[styles.title, { color: theme.text }]}>Walk-in</Text>
        <Text style={[styles.subtitle, { color: colorScheme === 'dark' ? '#9BA1A6' : '#666' }]}>Your Fridge</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={{ color: theme.text, marginTop: 12 }}>Loading latest recipes...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.text }}>Error: {error}</Text>
        </View>
      ) : recipes.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: theme.text }}>No recipes yet. Add one from the Create tab!</Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item, idx) => item.id || `${item.recipe_name}-${idx}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isValidHttp = typeof item.photo_url === 'string' && /^https?:\/\//i.test(item.photo_url);
            const safeUri = isValidHttp ? encodeURI(item.photo_url) : null;
            return (
              <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1f2123' : '#f7f7f7' }]}> 
                {safeUri ? (
                  <Image 
                    source={{ uri: safeUri }} 
                    style={styles.cardImage} 
                    onError={(e) => {
                      console.error('[HOME] Image load error for', safeUri, e?.nativeEvent);
                    }}
                  />
                ) : (
                  <View style={[styles.cardImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#eaeaea' }]}> 
                    <Text style={{ color: colorScheme === 'dark' ? '#9BA1A6' : '#666' }}>No image</Text>
                  </View>
                )}
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                  {item.recipe_name}
                </Text>
                <Text style={[styles.cardSubtitle, { color: colorScheme === 'dark' ? '#9BA1A6' : '#666' }]} numberOfLines={2}>
                  {item.ingredients}
                </Text>
              </View>
            </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16, // Added padding to container
  },
  header: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    marginHorizontal: -16, // Offset header padding with negative margins
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 24,
    fontWeight: "600",
  },
  listContent: {
    paddingVertical: 12,
  },
  card: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 180,
  },
  cardBody: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
