import { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
// Import legacy FileSystem API
import { documentDirectory, copyAsync } from 'expo-file-system/legacy';

/**
 * ExamScanner Component
 * 
 * Allows users to scan bubble sheet answer papers using camera or photo gallery.
 */
export default function ExamScanner({ answerKey, onScanComplete, onImageSaved }) {
    // --- STATE MANAGEMENT ---
    const [facing, setFacing] = useState('back');
    const [permission, requestPermission] = useCameraPermissions();
    const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
    const [capturedImage, setCapturedImage] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [cameraRef, setCameraRef] = useState(null);

    // --- CAMERA PERMISSION HANDLING ---
    if (!permission) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0038A8" />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={80} color="#94A3B8" />
                <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                <Text style={styles.permissionText}>
                    We need camera access to scan exam papers
                </Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Ionicons name="camera" size={20} color="#fff" />
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // --- HANDLERS ---

    const handleTakePicture = async () => {
        if (!cameraRef) return;

        try {
            const photo = await cameraRef.takePictureAsync({
                quality: 0.8,
                base64: false,
            });
            console.log('📸 Camera photo captured:', photo.uri);
            setCapturedImage(photo.uri);
        } catch (error) {
            Alert.alert('Error', 'Failed to capture image. Please try again.');
            console.error('❌ Camera capture error:', error);
        }
    };

    const handlePickFromGallery = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled) {
                console.log('🖼️ Gallery image selected:', result.assets[0].uri);
                setCapturedImage(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image. Please try again.');
            console.error('❌ Gallery picker error:', error);
        }
    };

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    const handleRetake = () => {
        setCapturedImage(null);
    };

    const handleSaveImage = async () => {
        console.log('💾 Save button pressed');
        console.log('📍 Captured image URI:', capturedImage);
        
        if (!capturedImage) {
            console.log('❌ No captured image found');
            return;
        }

        setIsSaving(true);

        try {
            // Generate filename
            const filename = `exam_${Date.now()}.jpg`;
            const fileUri = documentDirectory + filename;
            
            console.log('📂 Original URI:', capturedImage);
            console.log('📂 Document Directory:', documentDirectory);
            console.log('📂 Target URI:', fileUri);
            
            // Copy image using legacy API
            console.log('📋 Starting file copy...');
            await copyAsync({
                from: capturedImage,
                to: fileUri,
            });

            console.log('✅ File copied successfully to:', fileUri);

            // Try to save to device gallery (optional)
            if (mediaLibraryPermission?.granted) {
                try {
                    await MediaLibrary.createAssetAsync(capturedImage);
                    console.log('✅ Image saved to gallery');
                } catch (galleryError) {
                    console.log('⚠️ Gallery save failed (non-critical):', galleryError);
                }
            } else {
                console.log('ℹ️ Skipping gallery save (no permission)');
            }

            setIsSaving(false);

            // Create image data object
            const imageData = {
                uri: fileUri,
                filename: filename,
                timestamp: new Date().toISOString(),
            };
            
            console.log('📦 Image data prepared:', imageData);
            console.log('🔔 Calling onImageSaved callback...');
            
            // Pass the image data to parent IMMEDIATELY
            if (onImageSaved) {
                onImageSaved(imageData);
                console.log('✅ onImageSaved callback executed');
            } else {
                console.log('⚠️ onImageSaved callback not provided');
            }

            // Show success message AFTER saving
            Alert.alert(
                'Image Saved Successfully! ✅',
                'The exam paper is now available in the CSV File tab.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setCapturedImage(null);
                        },
                    },
                ]
            );
        } catch (error) {
            setIsSaving(false);
            console.error('❌ Save error details:', {
                message: error.message,
                stack: error.stack,
                error: error
            });
            
            Alert.alert(
                'Save Failed',
                `Failed to save image: ${error.message}\n\nPlease try again or use a different image.`,
                [{ text: 'OK' }]
            );
        }
    };

    // --- RENDER ---

    if (capturedImage) {
        return (
            <View style={styles.container}>
                <View style={styles.previewContainer}>
                    <Image 
                        source={{ uri: capturedImage }} 
                        style={styles.previewImage}
                        onError={(error) => {
                            console.log('❌ Preview image load error:', error.nativeEvent.error);
                        }}
                        onLoad={() => {
                            console.log('✅ Preview image loaded successfully');
                        }}
                    />

                    {isSaving && (
                        <View style={styles.processingOverlay}>
                            <ActivityIndicator size="large" color="#fff" />
                            <Text style={styles.processingText}>Saving image...</Text>
                        </View>
                    )}
                </View>

                <View style={styles.previewActions}>
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleRetake}
                        disabled={isSaving}
                    >
                        <Ionicons name="camera-outline" size={20} color="#0038A8" />
                        <Text style={styles.secondaryButtonText}>Retake</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
                        onPress={handleSaveImage}
                        disabled={isSaving}
                    >
                        <Ionicons name="save-outline" size={20} color="#fff" />
                        <Text style={styles.primaryButtonText}>Save</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing={facing}
                ref={ref => setCameraRef(ref)}
            >
                <View style={styles.cameraOverlay}>
                    <View style={styles.instructionBox}>
                        <Ionicons name="scan" size={32} color="#fff" />
                        <Text style={styles.instructionText}>
                            Align the answer sheet within the frame
                        </Text>
                    </View>
                    <View style={styles.frameGuide} />
                </View>
            </CameraView>

            <View style={styles.cameraControls}>
                <TouchableOpacity style={styles.controlButton} onPress={handlePickFromGallery}>
                    <Ionicons name="images-outline" size={28} color="#fff" />
                    <Text style={styles.controlButtonLabel}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.captureButton} onPress={handleTakePicture}>
                    <View style={styles.captureButtonInner} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
                    <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
                    <Text style={styles.controlButtonLabel}>Flip</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// --- STYLES ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        backgroundColor: '#fff',
    },
    permissionTitle: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        color: '#1E293B',
        marginTop: 24,
        marginBottom: 8,
    },
    permissionText: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 32,
    },
    permissionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0038A8',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    instructionBox: {
        alignItems: 'center',
        marginTop: 40,
        paddingHorizontal: 20,
    },
    instructionText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        textAlign: 'center',
        marginTop: 12,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    frameGuide: {
        position: 'absolute',
        top: '25%',
        left: '10%',
        right: '10%',
        height: '50%',
        borderWidth: 3,
        borderColor: '#fff',
        borderRadius: 12,
        borderStyle: 'dashed',
    },
    cameraControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 30,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    controlButton: {
        alignItems: 'center',
        gap: 4,
    },
    controlButtonLabel: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Inter_500Medium',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#0038A8',
    },
    captureButtonInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#0038A8',
    },
    previewContainer: {
        flex: 1,
        position: 'relative',
    },
    previewImage: {
        flex: 1,
        resizeMode: 'contain',
    },
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    processingText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
    },
    previewActions: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    primaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0038A8',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
    },
    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    secondaryButtonText: {
        color: '#0038A8',
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});