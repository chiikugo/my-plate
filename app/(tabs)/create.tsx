import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SupabaseService } from '../../lib/supabaseService';

export default function CreateRecipeScreen() {
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
  // Delay mounting the CameraView inside Modal to avoid surface race conditions on Android/Fabric
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
                // This will open device settings on mobile
                if (Platform.OS === 'ios') {
                  // For iOS, we can't programmatically open settings, but we can guide the user
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
    // Only reset readiness when the camera modal closes
    if (!cameraVisible) {
      setCameraReady(false);
    }
  }, [cameraVisible]);

  // Defer rendering the CameraView briefly after showing the Modal to avoid black preview on Android
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

  // Add render log for debugging
  console.log('[RENDER] cameraReady:', cameraReady, 'isTakingPhoto:', isTakingPhoto);

  // Helper to fetch a local file URI as a Blob (for React Native/Expo)
  const uriToBlob = async (uri: string): Promise<Blob> => {
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function (e) {
        reject(new TypeError('Network request failed'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  };

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
      quality: 1,
    });
    if (!result.canceled) {
      try {
        const uri = result.assets[0].uri;
        setImageUri(uri); // Show preview immediately
        setIsUploadingImage(true);
        const blob = await uriToBlob(uri);
        const fileName = uri.split('/').pop() || `image_${Date.now()}.jpg`;
        const publicUrl = await SupabaseService.uploadImage(blob, fileName);
        setImageUri(publicUrl); // Use public URL for saving
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Image Upload Error', 'Failed to upload image. Please try again.');
      } finally {
        setIsUploadingImage(false);
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

  const openCamera = async () => {
    // Check if we have camera permissions
    const hasPermission = await checkCameraPermissions();
    if (!hasPermission) {
      return;
    }
    
    // Reset camera state
    setCameraReady(false);
    setIsTakingPhoto(false);
    setCameraVisible(true);
    
    // For mobile, we need to ensure the camera is properly initialized
    if (Platform.OS !== 'web') {
      console.log('Opening camera on mobile device');
    }
  };

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
      return; // Prevent multiple simultaneous photo captures
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
            skipProcessing: true, // Skip processing on mobile to avoid capture issues
            exif: false,
          };
      const photo = await cameraRef.current.takePictureAsync(photoOptions);
      console.log('[takePhoto] Photo taken:', photo);
      if (photo && photo.uri) {
        setImageUri(photo.uri); // Show preview immediately
        setCameraVisible(false);
        setCameraReady(false);
        setIsUploadingImage(true);
        // Upload to Supabase Storage
        try {
          console.log('[takePhoto] Converting URI to blob:', photo.uri);
          const blob = await uriToBlob(photo.uri);
          const fileName = photo.uri.split('/').pop() || `photo_${Date.now()}.jpg`;
          console.log('[takePhoto] Uploading to Supabase:', fileName);
          const publicUrl = await SupabaseService.uploadImage(blob, fileName);
          setImageUri(publicUrl); // Use public URL for saving
          console.log('[takePhoto] Upload successful, public URL:', publicUrl);
        } catch (error) {
          console.error('[takePhoto] Error uploading photo:', error);
          Alert.alert('Image Upload Error', 'Failed to upload photo. Please try again.');
        } finally {
          setIsUploadingImage(false);
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

    setIsSaving(true);

    try {
      console.log('💾 Saving recipe to Supabase...');
      
      const recipeData = {
        name: recipeName.trim(),
        ingredients: ingredients.trim(),
        instructions: instructions.trim(),
        image_url: imageUri || undefined,
      };

      console.log('📊 Recipe data:', recipeData);

      const savedRecipe = await SupabaseService.createRecipe(recipeData);
      
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
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Add Item</Text>

        {imageUri && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            {isUploadingImage && (
              <View style={{ marginTop: 10, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={{ color: '#007AFF', marginTop: 4 }}>Uploading image...</Text>
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

      <Modal 
        visible={cameraVisible} 
        transparent={false} 
        animationType="slide"
    // On Android, enabling hardware acceleration prevents black camera preview in Modal
    hardwareAccelerated
        presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
      >
        <View style={styles.modalContainer}>
          {shouldRenderCamera && (
            <CameraView 
            style={styles.camera}
            ref={cameraRef}
              facing={cameraFacing}
        // Force remount when toggling visibility or switching cameras to avoid stale surfaces on mobile
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  content: {
    flex: 1,
    padding: 24
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#333',
    textAlign: 'center'
  },
  imageContainer: {
    marginBottom: 24,
    alignItems: 'center'
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 8
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    width: '45%'
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600'
  },
  inputContainer: {
    marginBottom: 24
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666'
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },
  textArea: {
    height: 150
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
    ...(Platform.OS !== 'web' && {
      // Mobile-specific styles
      position: 'relative',
    })
  },
  camera: {
    flex: 1,
    ...(Platform.OS !== 'web' && {
      // Mobile-specific camera styles
      width: '100%',
      height: '100%',
    })
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
    backgroundColor: 'transparent'
  },
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 15,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center'
  },
  captureButton: {
    backgroundColor: '#FF0000',
    padding: 15,
    borderRadius: 50,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center'
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  switchCameraButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 15,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center'
  },
  switchCameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});