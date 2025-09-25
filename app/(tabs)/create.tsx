import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SupabaseService } from '../../lib/supabaseService';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function CreateRecipeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [recipeName, setRecipeName] = useState<string>("");
  const [ingredients, setIngredients] = useState<string>("");
  const [instructions, setInstructions] = useState<string>("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState<boolean>(false);
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const cameraRef = useRef<CameraView>(null);
  const [shouldRenderCamera, setShouldRenderCamera] = useState<boolean>(false);
  const renderDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check camera permissions when component mounts
  useEffect(() => {
    const checkPermissions = async () => {
      if (permission && !permission.granted) {
        console.log('Requesting camera permissions...');
        const { status } = await requestPermission();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'This app needs camera access to take photos. Please grant camera permissions in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => {
                if (Platform.OS === 'ios') {
                  Alert.alert('Settings', 'Please go to Settings > Privacy & Security > Camera and enable camera access for this app.');
                }
              }}
            ]
          );
        }
      }
    };
    
    checkPermissions();
  }, [permission]);

  // Mobile-specific camera initialization
  useEffect(() => {
    if (!cameraVisible) {
      setCameraReady(false);
    }
  }, [cameraVisible]);

  // Defer rendering the CameraView briefly after showing the Modal
  useEffect(() => {
    if (cameraVisible) {
      setShouldRenderCamera(false);
      if (renderDelayRef.current) clearTimeout(renderDelayRef.current);
      renderDelayRef.current = setTimeout(() => {
        setShouldRenderCamera(true);
      }, Platform.OS === 'android' ? 80 : 0);
    } else {
      setShouldRenderCamera(false);
      if (renderDelayRef.current) {
        clearTimeout(renderDelayRef.current);
        renderDelayRef.current = null;
      }
    }
    return () => {
      if (renderDelayRef.current) {
        clearTimeout(renderDelayRef.current);
        renderDelayRef.current = null;
      }
    };
  }, [cameraVisible]);

  console.log('[RENDER] cameraReady:', cameraReady, 'isTakingPhoto:', isTakingPhoto);

  // Get content type from filename/uri
  // Used to provide a correct MIME type when uploading to Supabase Storage.
  const inferContentType = (nameOrUri: string): string => {
    const lower = nameOrUri.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.startsWith('data:image/png')) return 'image/png';
    if (lower.startsWith('data:image/jpg') || lower.startsWith('data:image/jpeg')) return 'image/jpeg';
    return 'application/octet-stream';
  };

  // Enhanced image upload helper
  // - On Web: loads the URI as a Blob, then uploads to Supabase Storage
  // - On Native (iOS/Android): loads the URI as bytes (Uint8Array), then uploads
  // - Returns the public image URL created by Supabase Storage (requires public bucket or read policy)
  const uploadImageToSupabase = async (uri: string, source: 'gallery' | 'camera' | 'retry'): Promise<string> => {
    try {
      console.log(`🔄 [${source.toUpperCase()}] Starting upload for URI:`, uri);
      setIsUploadingImage(true);
      
      const fileName = `${source}_${Date.now()}_${uri.split('/').pop() || 'image.jpg'}`;
      const contentType = inferContentType(fileName) || 'image/jpeg';

      let publicUrl: string;
      if (Platform.OS === 'web') {
        const resp = await fetch(uri);
        const blob = await resp.blob();
        console.log(`☁️ [${source.toUpperCase()}] Uploading Blob to Supabase:`, fileName, contentType);
        publicUrl = await SupabaseService.uploadImage(blob, fileName, blob.type || contentType);
      } else {
        const resp = await fetch(uri);
        const arrayBuffer = await resp.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        console.log(`☁️ [${source.toUpperCase()}] Uploading bytes to Supabase:`, fileName, contentType, `(size=${bytes.byteLength})`);
        publicUrl = await SupabaseService.uploadImage(bytes, fileName, contentType);
      }
      
      console.log(`✅ [${source.toUpperCase()}] Upload successful:`, publicUrl);
      return publicUrl;
    } catch (error) {
      console.error(`❌ [${source.toUpperCase()}] Upload failed:`, error);
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Enhanced pick image function
  // Launches the media library, previews image locally, then uploads to Supabase.
  // On success, the preview is updated to use the final Supabase public URL.
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      try {
        const uri = result.assets[0].uri;
        setImageUri(uri); // Show preview immediately
        
        const publicUrl = await uploadImageToSupabase(uri, 'gallery');
        setImageUri(publicUrl); // Use public URL for database
        
        Alert.alert('Success', 'Image uploaded successfully!');
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
        setImageUri(null); // Reset on error
      }
    }
  };

  const checkCameraPermissions = async () => {
    if (!permission?.granted) {
      console.log('Requesting camera permissions...');
      const { status } = await requestPermission();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'This app needs camera access to take photos. Please grant camera permissions in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: () => checkCameraPermissions() }
          ]
        );
        return false;
      }
    }
    return true;
  };

  // Opens the camera modal after checking permissions.
  const openCamera = async () => {
    const hasPermission = await checkCameraPermissions();
    if (!hasPermission) {
      return;
    }
    
    setCameraReady(false);
    setIsTakingPhoto(false);
    setCameraVisible(true);
    
    if (Platform.OS !== 'web') {
      console.log('Opening camera on mobile device');
    }
  };

  // Takes a photo using the Expo Camera.
  // After capture, we immediately preview the local URI and then upload it.
  // On successful upload, imageUri is replaced with the Supabase public URL.
  const takePhoto = async () => {
    console.log('[takePhoto] Button pressed');
    console.log('[takePhoto] cameraReady:', cameraReady, 'cameraRef:', !!cameraRef.current, 'isTakingPhoto:', isTakingPhoto);
    
    if (!cameraRef.current) {
      Alert.alert('Camera Not Ready', 'Camera reference is not available.');
      console.log('[takePhoto] Camera reference is not available.');
      return;
    }
    if (!cameraReady) {
      Alert.alert('Camera Not Ready', 'Please wait for the camera to initialize.');
      console.log('[takePhoto] Camera is not ready.');
      return;
    }
    if (isTakingPhoto) {
      console.log('[takePhoto] Already taking a photo, aborting.');
      return;
    }
    
    setIsTakingPhoto(true);
    try {
      console.log('[takePhoto] Taking picture...');
      const photoOptions = Platform.OS === 'web' 
        ? {
            quality: 0.8,
            base64: false,
            skipProcessing: false,
          }
        : {
            quality: 0.8,
            base64: false,
            skipProcessing: true,
            exif: false,
          };
      
      const photo = await cameraRef.current.takePictureAsync(photoOptions);
      console.log('[takePhoto] Photo taken:', photo);
      
      if (photo && photo.uri) {
        setImageUri(photo.uri); // Show preview immediately
        setCameraVisible(false);
        setCameraReady(false);
        
        try {
          const publicUrl = await uploadImageToSupabase(photo.uri, 'camera');
          setImageUri(publicUrl); // Use public URL for database
          
          Alert.alert('Success', 'Photo uploaded successfully!');
        } catch (error) {
          console.error('Error uploading photo:', error);
          Alert.alert('Upload Error', 'Failed to upload photo. Please try again.');
          setImageUri(null); // Reset on error
        }
      } else {
        console.log('[takePhoto] Photo capture returned invalid data:', photo);
        throw new Error('Photo capture returned invalid data');
      }
    } catch (error: any) {
      console.error('[takePhoto] Error taking photo:', error);
      let errorMessage = 'Failed to take photo. Please try again.';
      if (error.message?.includes('Image could not be captured')) {
        errorMessage = 'Camera capture failed. Please ensure the camera is properly initialized and try again.';
      } else if (error.message) {
        errorMessage = `Failed to take photo: ${error.message}`;
      }
      Alert.alert('Camera Error', errorMessage);
    } finally {
      setIsTakingPhoto(false);
      console.log('[takePhoto] Done. isTakingPhoto set to false.');
    }
  };

  const switchCamera = () => {
    setCameraFacing(prev => prev === 'back' ? 'front' : 'back');
    setCameraReady(false);
  };

  const handleCameraReady = () => {
    console.log('Camera is ready - setting cameraReady to true');
    setCameraReady(true);
  };

  const handleCameraError = (error: any) => {
    console.error('Camera error:', error);
    let errorMessage = 'Failed to initialize camera. Please check your camera permissions and try again.';
    
    if (Platform.OS === 'web') {
      errorMessage = `Failed to initialize camera: ${error.message || 'Unknown error'}`;
    } else if (error.message?.includes('permission')) {
      errorMessage = 'Camera permission denied. Please grant camera permissions in your device settings.';
    } else if (error.message?.includes('not available')) {
      errorMessage = 'Camera is not available on this device.';
    }
    
    Alert.alert('Camera Error', errorMessage);
    setCameraVisible(false);
    setCameraReady(false);
    setIsTakingPhoto(false);
  };

  const closeCamera = () => {
    console.log('Closing camera');
    setCameraVisible(false);
    setCameraReady(false);
  };

  // NEW: Image management functions
  const removeImage = () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => setImageUri(null)
        }
      ]
    );
  };

  const retryImageUpload = async () => {
    if (!imageUri) return;
    
    try {
      const publicUrl = await uploadImageToSupabase(imageUri, 'retry');
      setImageUri(publicUrl);
      Alert.alert('Success', 'Image re-uploaded successfully!');
    } catch (error) {
      Alert.alert('Upload Error', 'Failed to re-upload image. Please try again.');
    }
  };

  // Save the recipe to the `test_recipes` table.
  // Requires that `imageUri` already holds a Supabase public URL from a successful upload.
  // Maps to columns: recipe_name, ingredients, instructions, photo_url
  const saveRecipe = async () => {
    if (isUploadingImage) {
      Alert.alert('Image Uploading', 'Please wait for the image to finish uploading before saving.');
      return;
    }
    if (!recipeName.trim()) {
      Alert.alert('Error', 'Please enter a recipe name');
      return;
    }
    if (!ingredients.trim()) {
      Alert.alert('Error', 'Please enter ingredients');
      return;
    }
    if (!instructions.trim()) {
      Alert.alert('Error', 'Please enter instructions');
      return;
    }
    // Require an uploaded image with a public URL
    if (!imageUri || !imageUri.includes('supabase')) {
      Alert.alert('Image Required', 'Please upload a photo first, then save.');
      return;
    }

    setIsSaving(true);

    try {
      console.log('💾 Saving recipe to Supabase (test_recipes)...');

      const testRecipeInput = {
        recipe_name: recipeName.trim(),
        ingredients: ingredients.trim(),
        instructions: instructions.trim(),
        photo_url: imageUri,
      };

      console.log('📊 test_recipes input:', testRecipeInput);

      const savedRecipe = await SupabaseService.createTestRecipe(testRecipeInput);
      
      console.log('✅ Recipe saved successfully:', savedRecipe);
      
      Alert.alert(
        'Success', 
        'Recipe saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setRecipeName('');
              setIngredients('');
              setInstructions('');
              setImageUri(null);
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error saving recipe:', error);
      Alert.alert(
        'Error', 
        'Failed to save recipe. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
        <Text style={styles.title}>Add Item</Text>

        {/* Enhanced Image Container */}
        {imageUri && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            
            {/* Upload Status */}
            {isUploadingImage && (
              <View style={styles.uploadStatus}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.uploadText}>Uploading image...</Text>
              </View>
            )}
            
            {/* Image Actions */}
            {!isUploadingImage && (
              <View style={styles.imageActions}>
                <TouchableOpacity 
                  style={styles.imageActionButton} 
                  onPress={removeImage}
                >
                  <Text style={styles.imageActionText}>Remove</Text>
                </TouchableOpacity>
                
                {/* Show retry if URL doesn't look like Supabase URL */}
                {!imageUri.includes('supabase') && (
                  <TouchableOpacity 
                    style={[styles.imageActionButton, styles.retryButton]} 
                    onPress={retryImageUpload}
                  >
                    <Text style={styles.imageActionText}>Retry Upload</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>Choose from Library</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, !permission?.granted && styles.buttonDisabled]} 
            onPress={openCamera}
            disabled={!permission?.granted}
          >
            <Text style={styles.buttonText}>
              {!permission?.granted ? 'Grant Camera Permission' : 'Take Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Recipe Name</Text>
          <TextInput
            style={styles.input}
            value={recipeName}
            onChangeText={setRecipeName}
            placeholder="Enter recipe name..."
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Ingredients</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={ingredients}
            onChangeText={setIngredients}
            placeholder="List your ingredients..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Instructions</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Write your cooking instructions..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, (isSaving || isUploadingImage) && styles.saveButtonDisabled]} 
          onPress={saveRecipe}
          disabled={isSaving || isUploadingImage}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : isUploadingImage ? 'Uploading Image...' : 'Save Recipe'}
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal 
        visible={cameraVisible} 
        transparent={false} 
        animationType="slide"
        hardwareAccelerated
        presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
      >
        <View style={styles.modalContainer}>
          {shouldRenderCamera && (
            <CameraView 
              style={styles.camera}
              ref={cameraRef}
              facing={cameraFacing}
              key={`${cameraFacing}-${cameraVisible ? 'open' : 'closed'}`}
              onCameraReady={handleCameraReady}
              onMountError={handleCameraError}
            />
          )}
          <View style={styles.cameraButtons}>
            <TouchableOpacity style={styles.closeButton} onPress={closeCamera}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.captureButton, (!cameraReady || isTakingPhoto) && styles.captureButtonDisabled]} 
              onPress={takePhoto}
              disabled={!cameraReady || isTakingPhoto}
            >
              <Text style={styles.captureButtonText}>
                {isTakingPhoto ? 'Taking...' : 'Capture'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.switchCameraButton} 
              onPress={switchCamera}
            >
              <Text style={styles.switchCameraButtonText}>Switch</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scroll: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 24,
      paddingBottom: 40,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 32,
      color: theme.text,
      textAlign: 'center',
    },
    imageContainer: {
      marginBottom: 24,
      alignItems: 'center',
    },
    image: {
      width: 200,
      height: 200,
      borderRadius: 8,
    },
    // NEW: Enhanced image upload styles
    uploadStatus: {
      marginTop: 10,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    uploadText: {
      color: theme.tint,
      marginLeft: 8,
      fontSize: 14,
    },
    imageActions: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 12,
      gap: 16,
    },
    imageActionButton: {
      backgroundColor: '#FF6B6B',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
    },
    retryButton: {
      backgroundColor: '#FFA500',
    },
    imageActionText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 24,
    },
    button: {
      backgroundColor: '#007AFF',
      padding: 12,
      borderRadius: 8,
      width: '45%',
    },
    buttonDisabled: {
      backgroundColor: '#555',
      opacity: 0.6,
    },
    buttonText: {
      color: '#fff',
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
    },
    inputContainer: {
      marginBottom: 24,
    },
    label: {
      fontSize: 16,
      marginBottom: 8,
      color: theme.text,
    },
    input: {
      backgroundColor: theme === Colors.dark ? '#1f2123' : '#f5f5f5',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.text,
    },
    textArea: {
      height: 150,
    },
    saveButton: {
      backgroundColor: '#4CAF50',
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 24,
    },
    saveButtonDisabled: {
      backgroundColor: '#2a2a2a',
      opacity: 0.6,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.background,
      ...(Platform.OS !== 'web' && {
        position: 'relative',
      }),
    },
    camera: {
      flex: 1,
      ...(Platform.OS !== 'web' && {
        width: '100%',
        height: '100%',
      }),
    },
    cameraButtons: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      backgroundColor: 'transparent',
    },
    closeButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: 15,
      borderRadius: 8,
      minWidth: 80,
      alignItems: 'center',
    },
    captureButton: {
      backgroundColor: '#FF0000',
      padding: 15,
      borderRadius: 50,
      width: 70,
      height: 70,
      justifyContent: 'center',
      alignItems: 'center',
    },
    captureButtonDisabled: {
      opacity: 0.5,
    },
    closeButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    captureButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    switchCameraButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: 15,
      borderRadius: 8,
      minWidth: 80,
      alignItems: 'center',
    },
    switchCameraButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

// util to determine readable text color for buttons
function colorReadable(hex: string): boolean {
  // simple luminance check; assume hex like #RRGGBB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6; // true => use dark text
}