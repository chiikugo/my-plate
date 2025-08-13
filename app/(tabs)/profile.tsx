import * as ImagePicker from 'expo-image-picker';
import { useState } from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
    console.log('[UI] Testing bucket access via list...');
    try {
      const files = await SupabaseService.listBucketFiles();
      console.log('[UI] Bucket list result:', files);
      setListResult(
        files.length
          ? `✅ Bucket list OK. Files: ${files.slice(0, 5).join(', ')}${files.length > 5 ? ` (+${files.length - 5} more)` : ''}`
          : '✅ Bucket list OK. No files found.'
      );
    } catch (error: any) {
      console.error('[UI] Bucket list failed:', error);
      setListResult('❌ Bucket list failed: ' + (error?.message || String(error)));
    } finally {
      setListing(false);
    }
  };

  // Enhanced image upload with detailed logging
  const testUploadImage = async () => {
    setUploading(true);
    setUploadResult(null);
    
    try {
      console.log('🔄 [UPLOAD] Starting image upload process...');
      
      // Check authentication status first
      console.log('🔄 [AUTH] Checking authentication status...');
      // Add this line to check auth (you'll need to import supabase)
      // const { data: { user } } = await supabase.auth.getUser();
      // console.log('👤 [AUTH] Current user:', user ? `${user.email} (${user.id})` : 'Not authenticated');
      
      // Request permissions on mobile
      if (Platform.OS !== 'web') {
        console.log('📱 [PERMISSION] Requesting media library permissions...');
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('📱 [PERMISSION] Result:', permissionResult);
        
        if (permissionResult.granted === false) {
          console.log('❌ [PERMISSION] Permission denied');
          Alert.alert("Permission required", "Please allow access to photo library");
          setUploading(false);
          return;
        }
        console.log('✅ [PERMISSION] Permission granted');
      }

      // Pick image
      console.log('🖼️ [PICKER] Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      console.log('🖼️ [PICKER] Picker result:', {
        canceled: result.canceled,
        assetsCount: result.assets?.length || 0
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const imageSize = result.assets[0].fileSize || 'unknown';
        
        console.log('🖼️ [IMAGE] Selected image:', {
          uri: imageUri,
          size: imageSize,
          width: result.assets[0].width,
          height: result.assets[0].height
        });
        
        // Convert to blob
        console.log('🔄 [BLOB] Converting image to blob...');
        const response = await fetch(imageUri);
        console.log('🔄 [BLOB] Fetch response status:', response.status);
        
        const blob = await response.blob();
        console.log('🔄 [BLOB] Blob created:', {
          size: blob.size,
          type: blob.type
        });
        
        // Upload to Supabase
        const fileName = `test-upload-${Date.now()}.jpg`;
        console.log('☁️ [SUPABASE] Starting upload with filename:', fileName);
        
        const url = await SupabaseService.uploadImage(blob, fileName);
        
        console.log('✅ [SUCCESS] Upload completed! URL:', url);
        setUploadResult('✅ Image uploaded! Public URL: ' + url);
      } else {
        console.log('❌ [PICKER] No image selected or picker was canceled');
        setUploadResult('❌ No image selected');
      }
    } catch (error: any) {
      console.error('❌ [ERROR] Upload failed:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        fullError: error
      });
      setUploadResult('❌ Image upload failed: ' + (error?.message || error.toString()));
    } finally {
      setUploading(false);
      console.log('🏁 [UPLOAD] Upload process finished');
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

      {/* Test Buttons */}
      <View style={styles.testContainer}>
        {/* Bucket List Test */}
        <TouchableOpacity
          style={styles.testButton}
          onPress={testListBucket}
          disabled={listing}
        >
          <Text style={styles.testButtonText}>
            {listing ? 'Listing...' : 'Test Bucket List'}
          </Text>
        </TouchableOpacity>
        {listResult && (
          <Text style={[styles.resultText, { color: listResult.startsWith('✅') ? 'green' : 'red' }]}>
            {listResult}
          </Text>
        )}

        {/* Image Upload Test - NOW VISIBLE ON ALL PLATFORMS */}
        <TouchableOpacity
          style={styles.testButton}
          onPress={testUploadImage}
          disabled={uploading}
        >
          <Text style={styles.testButtonText}>
            {uploading ? 'Uploading...' : 'Test Image Upload'}
          </Text>
        </TouchableOpacity>
        {uploadResult && (
          <Text style={[styles.resultText, { color: uploadResult.startsWith('✅') ? 'green' : 'red' }]}>
            {uploadResult}
          </Text>
        )}
      </View>
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
  // NEW: Clean styles for test section
  testContainer: {
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  testButton: {
    backgroundColor: '#0a7ea4',
    padding: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resultText: {
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});