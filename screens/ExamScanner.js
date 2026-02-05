import { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    Modal,
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
    const [showCamera, setShowCamera] = useState(false);
    const [facing, setFacing] = useState('back');
    const [flashMode, setFlashMode] = useState('off');
    const [permission, requestPermission] = useCameraPermissions();
    const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
    const [capturedImage, setCapturedImage] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [cameraRef, setCameraRef] = useState(null);

    // --- HANDLERS ---

    const handleOpenCamera = async () => {
        if (!permission) {
            Alert.alert('Error', 'Camera permission status is unknown');
            return;
        }

        if (!permission.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert(
                    'Camera Permission Required',
                    'Please grant camera permission to scan exam papers'
                );
                return;
            }
        }

        setShowCamera(true);
    };

    const handleCloseCamera = () => {
        setShowCamera(false);
    };

    const handleTakePicture = async () => {
        if (!cameraRef) return;

        try {
            const photo = await cameraRef.takePictureAsync({
                quality: 0.8,
                base64: false,
            });
            console.log('📸 Camera photo captured:', photo.uri);
            setCapturedImage(photo.uri);
            setShowCamera(false);
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

    const toggleFlashMode = () => {
        setFlashMode(current => {
            if (current === 'off') return 'on';
            if (current === 'on') return 'auto';
            return 'off';
        });
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

    // Image Preview Screen
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

    // Landing Screen with Upload and Scan Buttons
    return (
        <>
            <View style={styles.container}>
                <View style={styles.landingContainer}>
                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <Ionicons name="scan-circle-outline" size={80} color="#0038A8" />
                    </View>

                    {/* Title */}
                    <Text style={styles.landingTitle}>Scan Exam Paper</Text>
                    <Text style={styles.landingSubtitle}>
                        Choose how you want to capture the answer sheet
                    </Text>

                    {/* Buttons */}
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={handlePickFromGallery}
                            activeOpacity={0.8}
                        >
                            <View style={styles.buttonIcon}>
                                <Ionicons name="images" size={28} color="#0038A8" />
                            </View>
                            <Text style={styles.uploadButtonText}>Upload Image</Text>
                            <Text style={styles.buttonDescription}>
                                Choose from gallery
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.scanButton}
                            onPress={handleOpenCamera}
                            activeOpacity={0.8}
                        >
                            <View style={styles.buttonIcon}>
                                <Ionicons name="camera" size={28} color="#fff" />
                            </View>
                            <Text style={styles.scanButtonText}>Scan Now</Text>
                            <Text style={styles.scanButtonDescription}>
                                Open camera to scan
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info Box */}
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={18} color="#64748B" />
                        <Text style={styles.infoText}>
                            Make sure the answer sheet is well-lit and clearly visible
                        </Text>
                    </View>
                </View>
            </View>

            {/* Fullscreen Camera Modal */}
            <Modal
                visible={showCamera}
                animationType="slide"
                statusBarTranslucent={true}
            >
                <View style={styles.fullscreenContainer}>
                    <CameraView
                        style={styles.fullscreenCamera}
                        facing={facing}
                        flash={flashMode}
                        ref={ref => setCameraRef(ref)}
                    >
                        {/* Camera Overlay */}
                        <View style={styles.cameraOverlay}>
                            {/* Top Bar */}
                            <View style={styles.cameraTopBar}>
                                <TouchableOpacity 
                                    style={styles.cameraTopButton} 
                                    onPress={handleCloseCamera}
                                >
                                    <Ionicons name="close" size={28} color="#fff" />
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.cameraTopButton} 
                                    onPress={toggleFlashMode}
                                >
                                    <Ionicons 
                                        name={
                                            flashMode === 'off' ? 'flash-off' :
                                            flashMode === 'on' ? 'flash' : 'flash-outline'
                                        } 
                                        size={28} 
                                        color="#fff" 
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Center Instructions */}
                            <View style={styles.cameraCenter}>
                                <View style={styles.instructionBox}>
                                    <Ionicons name="scan" size={40} color="#fff" />
                                    <Text style={styles.instructionText}>
                                        Align the answer sheet within the frame
                                    </Text>
                                </View>
                                <View style={styles.frameGuide} />
                            </View>

                            {/* Bottom Controls */}
                            <View style={styles.cameraBottomBar}>
                                <TouchableOpacity 
                                    style={styles.flipButton} 
                                    onPress={toggleCameraFacing}
                                >
                                    <Ionicons name="camera-reverse-outline" size={32} color="#fff" />
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.captureButton} 
                                    onPress={handleTakePicture}
                                >
                                    <View style={styles.captureButtonInner} />
                                </TouchableOpacity>

                                <View style={styles.flipButton} />
                            </View>
                        </View>
                    </CameraView>
                </View>
            </Modal>
        </>
    );
}

// --- STYLES ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    
    // Landing Screen Styles
    landingContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 20,
    },
    landingTitle: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
        color: '#1E293B',
        marginBottom: 6,
        textAlign: 'center',
    },
    landingSubtitle: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 28,
        paddingHorizontal: 20,
    },
    actionButtonsContainer: {
        width: '100%',
        gap: 12,
        marginBottom: 24,
    },
    uploadButton: {
        backgroundColor: '#F8FAFC',
        borderWidth: 2,
        borderColor: '#0038A8',
        borderRadius: 14,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#0038A8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    scanButton: {
        backgroundColor: '#0038A8',
        borderRadius: 14,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#0038A8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
    },
    buttonIcon: {
        marginBottom: 8,
    },
    uploadButtonText: {
        fontSize: 17,
        fontFamily: 'Inter_600SemiBold',
        color: '#0038A8',
        marginBottom: 3,
    },
    scanButtonText: {
        fontSize: 17,
        fontFamily: 'Inter_600SemiBold',
        color: '#fff',
        marginBottom: 3,
    },
    buttonDescription: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: '#64748B',
    },
    scanButtonDescription: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: 'rgba(255, 255, 255, 0.8)',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        padding: 14,
        borderRadius: 10,
        gap: 10,
        width: '100%',
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: '#64748B',
        lineHeight: 16,
    },

    // Fullscreen Camera Styles
    fullscreenContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    fullscreenCamera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    cameraTopBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
    },
    cameraTopButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    instructionBox: {
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    instructionText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        textAlign: 'center',
        marginTop: 12,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    frameGuide: {
        width: '80%',
        aspectRatio: 0.7,
        borderWidth: 3,
        borderColor: '#fff',
        borderRadius: 12,
        borderStyle: 'dashed',
    },
    cameraBottomBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        paddingBottom: 50,
    },
    flipButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
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

    // Preview Screen Styles
    previewContainer: {
        flex: 1,
        position: 'relative',
        backgroundColor: '#000',
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
        backgroundColor: '#000',
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