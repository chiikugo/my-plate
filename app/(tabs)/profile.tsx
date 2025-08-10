import { useState } from "react";

import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SupabaseService } from "../../lib/supabaseService";

export default function ProfileScreen() {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [listResult, setListResult] = useState<string | null>(null);
  const [listing, setListing] = useState(false);

  const testListBucket = async () => {
    setListing(true);
    setListResult(null);
    try {
      const files = await SupabaseService.listBucketFiles();
      setListResult(
        files.length
          ? `✅ Bucket list OK. Files: ${files.slice(0, 5).join(', ')}${files.length > 5 ? ` (+${files.length - 5} more)` : ''}`
          : '✅ Bucket list OK. No files found.'
      );
    } catch (error: any) {
      setListResult('❌ Bucket list failed: ' + (error?.message || String(error)));
    } finally {
      setListing(false);
    }
  };


  const testUploadImage = async () => {
    setUploading(true);
    setUploadResult(null);
    try {
      // Fetch a placeholder image as a blob
      const response = await fetch('https://via.placeholder.com/150');
      const blob = await response.blob();
      const url = await SupabaseService.uploadImage(blob, 'test-upload.png');
      setUploadResult('✅ Image uploaded! Public URL: ' + url);
    } catch (error: any) {
      setUploadResult('❌ Image upload failed: ' + (error?.message || error.toString()));
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
        </View>
        <Text style={styles.name}>John Doe</Text>
        <Text style={styles.email}>john.doe@example.com</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Recipes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>45</Text>
          <Text style={styles.statLabel}>Favorites</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>8</Text>
          <Text style={styles.statLabel}>Collections</Text>
        </View>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>My Recipes</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Favorites</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Collections</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Settings</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={{ alignItems: 'center', marginTop: 16 }}>
  <TouchableOpacity
    style={{ backgroundColor: '#0a7ea4', padding: 12, borderRadius: 8 }}
    onPress={testListBucket}
    disabled={listing}
  >
    <Text style={{ color: '#fff', fontWeight: 'bold' }}>
      {listing ? 'Listing...' : 'Test Bucket List'}
    </Text>
  </TouchableOpacity>
  {listResult && (
    <Text style={{ marginTop: 16, color: listResult.startsWith('✅') ? 'green' : 'red', textAlign: 'center' }}>
      {listResult}
    </Text>
  )}
</View>
{Platform.OS === 'web' && (
  <View style={{ alignItems: 'center', marginTop: 16 }}>
    <TouchableOpacity
      style={{ backgroundColor: '#0a7ea4', padding: 12, borderRadius: 8 }}
      onPress={testUploadImage}
      disabled={uploading}
    >
      <Text style={{ color: '#fff', fontWeight: 'bold' }}>
        {uploading ? 'Uploading...' : 'Test Web Upload to Bucket'}
      </Text>
    </TouchableOpacity>
    {uploadResult && (
      <Text style={{ marginTop: 16, color: uploadResult.startsWith('✅') ? 'green' : 'red', textAlign: 'center' }}>
        {uploadResult}
      </Text>
    )}
  </View>
)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    alignItems: "center",
    padding: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0a7ea4",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: "#666",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  menuContainer: {
    padding: 16,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuText: {
    fontSize: 16,
    color: "#333",
  },
  menuArrow: {
    fontSize: 20,
    color: "#999",
  },
});
