import { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
    Modal,
    Dimensions,
    Platform,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * CSVFileManager Component
 * 
 * File explorer-style interface for managing exam papers organized by folders.
 */
export default function CSVFileManager({ savedImages, onDeleteImage, folders }) {
    // --- STATE MANAGEMENT ---
    const [processingImage, setProcessingImage] = useState(null);
    const [generatedCSVs, setGeneratedCSVs] = useState({});
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [fullScreenImage, setFullScreenImage] = useState(null);
    const [viewingCSV, setViewingCSV] = useState(null);

    useEffect(() => {
        console.log('CSVFileManager - savedImages updated:', savedImages);
        console.log('CSVFileManager - Number of images:', savedImages?.length);
        console.log('CSVFileManager - Folders:', folders);
    }, [savedImages, folders]);

    // Get images for selected folder
    const getFolderImages = () => {
        if (!selectedFolder) return [];
        return (savedImages || []).filter(img => img.folderId === selectedFolder);
    };

    const folderImages = getFolderImages();

    // --- HANDLERS ---

    const handleFolderClick = (folderId) => {
        setSelectedFolder(folderId);
    };

    const handleBackToFolders = () => {
        setSelectedFolder(null);
    };

    const handleImagePress = (imageData) => {
        setFullScreenImage(imageData);
    };

    const handleCloseFullScreen = () => {
        setFullScreenImage(null);
    };

    /**
     * Convert exam paper image to CSV file
     */
    const handleConvertToCSV = async (imageData) => {
        setProcessingImage(imageData.uri);

        // Simulate processing delay
        setTimeout(async () => {
            try {
                // SIMULATION: Detect bubbles from image
                const detectedAnswers = simulateBubbleDetection(50);

                // Generate CSV content
                const csvContent = generateCSVContent(detectedAnswers, imageData.filename);

                // Save CSV file
                const csvFilename = imageData.filename.replace(/\.(jpg|jpeg|png)$/i, '.csv');
                const csvUri = FileSystem.documentDirectory + csvFilename;

                await FileSystem.writeAsStringAsync(csvUri, csvContent, {
                    encoding: FileSystem.EncodingType.UTF8,
                });

                // Store CSV info
                setGeneratedCSVs(prev => ({
                    ...prev,
                    [imageData.uri]: {
                        csvUri,
                        csvFilename,
                        timestamp: new Date().toISOString(),
                        content: csvContent,
                    },
                }));

                setProcessingImage(null);

                Alert.alert(
                    'CSV Generated',
                    `Successfully converted ${imageData.filename} to CSV format.`,
                    [{ text: 'OK' }]
                );
            } catch (error) {
                setProcessingImage(null);
                Alert.alert('Error', 'Failed to generate CSV. Please try again.');
                console.error(error);
            }
        }, 2000);
    };

    /**
     * View CSV content in the app
     */
    const handleViewCSV = async (csvInfo) => {
        try {
            const content = await FileSystem.readAsStringAsync(csvInfo.csvUri, {
                encoding: FileSystem.EncodingType.UTF8,
            });
            setViewingCSV({
                filename: csvInfo.csvFilename,
                content: content,
            });
        } catch (error) {
            console.error('Error reading CSV:', error);
            Alert.alert('Error', 'Failed to read CSV file.');
        }
    };

    /**
     * Save CSV file to phone using share dialog
     */
    const handleSaveToPhone = async (csvInfo) => {
        try {
            const isAvailable = await Sharing.isAvailableAsync();
            
            if (!isAvailable) {
                Alert.alert('Error', 'File sharing is not available on this device.');
                return;
            }

            // Share the CSV file directly
            await Sharing.shareAsync(csvInfo.csvUri, {
                mimeType: 'text/csv',
                dialogTitle: 'Save CSV File',
                UTI: 'public.comma-separated-values-text',
            });

        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Failed to share file. Please try again.');
        }
    };

    /**
     * Delete saved image
     */
    const handleDeleteImage = (imageData) => {
        Alert.alert(
            'Delete Image',
            'Are you sure you want to delete this exam paper?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Remove associated CSV if exists
                            if (generatedCSVs[imageData.uri]) {
                                const { csvUri } = generatedCSVs[imageData.uri];
                                await FileSystem.deleteAsync(csvUri, { idempotent: true });
                                setGeneratedCSVs(prev => {
                                    const newCSVs = { ...prev };
                                    delete newCSVs[imageData.uri];
                                    return newCSVs;
                                });
                                console.log('✅ CSV file deleted');
                            }
                            
                            // Call parent handler to delete the image file
                            if (onDeleteImage) {
                                onDeleteImage(imageData);
                            }
                        } catch (error) {
                            console.error('❌ Error deleting files:', error);
                            Alert.alert('Error', 'Failed to delete some files.');
                        }
                    },
                },
            ]
        );
    };

    // --- RENDER ---

    // Empty state - no images at all
    if (!savedImages || savedImages.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={80} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Saved Exam Papers</Text>
                <Text style={styles.emptyText}>
                    Capture exam papers using the Scan tab to convert them to CSV files
                </Text>
            </View>
        );
    }

    // FOLDER VIEW - Show list of folders
    if (!selectedFolder) {
        return (
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.explorerHeader}>
                    <Ionicons name="folder-open" size={24} color="#0038A8" />
                    <Text style={styles.explorerTitle}>My Folders</Text>
                </View>

                {/* Stats Card */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{folders.length}</Text>
                        <Text style={styles.statLabel}>Folders</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{savedImages.length}</Text>
                        <Text style={styles.statLabel}>Total Images</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                            {Object.keys(generatedCSVs).length}
                        </Text>
                        <Text style={styles.statLabel}>CSV Files</Text>
                    </View>
                </View>

                {/* Folder List */}
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles.folderGrid}>
                        {folders.map((folder) => {
                            const folderImageCount = savedImages.filter(
                                img => img.folderId === folder.id
                            ).length;

                            return (
                                <TouchableOpacity
                                    key={folder.id}
                                    style={styles.folderCard}
                                    onPress={() => handleFolderClick(folder.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.folderIconContainer}>
                                        <Ionicons name="folder" size={48} color="#0038A8" />
                                        {folderImageCount > 0 && (
                                            <View style={styles.folderBadge}>
                                                <Text style={styles.folderBadgeText}>
                                                    {folderImageCount}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.folderName} numberOfLines={1}>
                                        {folder.name}
                                    </Text>
                                    <Text style={styles.folderInfo}>
                                        {folderImageCount} {folderImageCount === 1 ? 'item' : 'items'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        );
    }

    // FILE VIEW - Show images in selected folder
    const currentFolder = folders.find(f => f.id === selectedFolder);
    
    return (
        <View style={styles.container}>
            {/* Breadcrumb Header */}
            <View style={styles.breadcrumbHeader}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={handleBackToFolders}
                >
                    <Ionicons name="arrow-back" size={24} color="#0038A8" />
                </TouchableOpacity>
                <View style={styles.breadcrumbContent}>
                    <Ionicons name="folder" size={20} color="#64748B" />
                    <Text style={styles.breadcrumbText}>{currentFolder?.name || 'Folder'}</Text>
                    <Text style={styles.breadcrumbCount}>({folderImages.length})</Text>
                </View>
            </View>

            {/* Empty folder state */}
            {folderImages.length === 0 ? (
                <View style={styles.emptyFolderContainer}>
                    <Ionicons name="images-outline" size={80} color="#94A3B8" />
                    <Text style={styles.emptyFolderTitle}>No Images in This Folder</Text>
                    <Text style={styles.emptyFolderText}>
                        Scan or upload exam papers and save them to this folder
                    </Text>
                    <TouchableOpacity 
                        style={styles.emptyFolderButton}
                        onPress={handleBackToFolders}
                    >
                        <Ionicons name="arrow-back" size={18} color="#0038A8" />
                        <Text style={styles.emptyFolderButtonText}>Back to Folders</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles.imageGrid}>
                        {folderImages.map((imageData, index) => {
                            const csvInfo = generatedCSVs[imageData.uri];
                            const isProcessing = processingImage === imageData.uri;

                            return (
                                <View key={imageData.uri} style={styles.imageCard}>
                                    {/* Image Preview */}
                                    <TouchableOpacity 
                                        style={styles.imagePreview}
                                        onPress={() => handleImagePress(imageData)}
                                        activeOpacity={0.9}
                                    >
                                        <Image
                                            source={{ uri: imageData.uri }}
                                            style={styles.thumbnailImage}
                                        />
                                        {isProcessing && (
                                            <View style={styles.processingOverlay}>
                                                <ActivityIndicator size="small" color="#fff" />
                                            </View>
                                        )}
                                        <View style={styles.zoomIndicator}>
                                            <Ionicons name="expand-outline" size={16} color="#fff" />
                                        </View>
                                    </TouchableOpacity>

                                    {/* Image Info */}
                                    <View style={styles.imageInfo}>
                                        <Text style={styles.imageFilename} numberOfLines={1}>
                                            {imageData.filename}
                                        </Text>
                                        <Text style={styles.imageDate}>
                                            {new Date(imageData.timestamp).toLocaleDateString()}
                                        </Text>
                                    </View>

                                    {/* Action Buttons */}
                                    <View style={styles.imageActions}>
                                        {!csvInfo && !isProcessing && (
                                            <TouchableOpacity
                                                style={styles.convertButton}
                                                onPress={() => handleConvertToCSV(imageData)}
                                            >
                                                <Ionicons name="document-text" size={16} color="#fff" />
                                                <Text style={styles.convertButtonText}>Convert to CSV</Text>
                                            </TouchableOpacity>
                                        )}

                                        {csvInfo && (
                                            <>
                                                <TouchableOpacity
                                                    style={styles.viewButton}
                                                    onPress={() => handleViewCSV(csvInfo)}
                                                >
                                                    <Ionicons name="eye-outline" size={16} color="#0038A8" />
                                                    <Text style={styles.viewButtonText}>View</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={styles.saveButton}
                                                    onPress={() => handleSaveToPhone(csvInfo)}
                                                >
                                                    <Ionicons name="download-outline" size={16} color="#fff" />
                                                    <Text style={styles.saveButtonText}>Save</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}

                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => handleDeleteImage(imageData)}
                                            disabled={isProcessing}
                                        >
                                            <Ionicons name="trash-outline" size={16} color="#CE1126" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            )}

            {/* Full Screen Image Modal */}
            <Modal
                visible={fullScreenImage !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCloseFullScreen}
            >
                <View style={styles.modalContainer}>
                    <TouchableOpacity 
                        style={styles.modalCloseButton}
                        onPress={handleCloseFullScreen}
                    >
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>

                    <ScrollView
                        contentContainerStyle={styles.modalScrollContent}
                        maximumZoomScale={3}
                        minimumZoomScale={1}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                    >
                        {fullScreenImage && (
                            <Image
                                source={{ uri: fullScreenImage.uri }}
                                style={styles.fullScreenImage}
                                resizeMode="contain"
                            />
                        )}
                    </ScrollView>

                    {fullScreenImage && (
                        <View style={styles.modalImageInfo}>
                            <Text style={styles.modalImageFilename} numberOfLines={1}>
                                {fullScreenImage.filename}
                            </Text>
                            <Text style={styles.modalImageDate}>
                                {new Date(fullScreenImage.timestamp).toLocaleString()}
                            </Text>
                        </View>
                    )}
                </View>
            </Modal>

            {/* CSV Viewer Modal */}
            <Modal
                visible={viewingCSV !== null}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setViewingCSV(null)}
            >
                <View style={styles.csvModalContainer}>
                    <View style={styles.csvModalHeader}>
                        <Text style={styles.csvModalTitle}>CSV Content</Text>
                        <TouchableOpacity 
                            style={styles.csvCloseButton}
                            onPress={() => setViewingCSV(null)}
                        >
                            <Ionicons name="close" size={24} color="#1E293B" />
                        </TouchableOpacity>
                    </View>
                    
                    {viewingCSV && (
                        <>
                            <Text style={styles.csvFilename}>{viewingCSV.filename}</Text>
                            <ScrollView style={styles.csvContentScroll}>
                                <Text style={styles.csvContent}>{viewingCSV.content}</Text>
                            </ScrollView>
                            
                            <View style={styles.csvModalFooter}>
                                <Text style={styles.csvHelpText}>
                                    💡 Close this viewer and tap the "Save" button to save to your phone
                                </Text>
                            </View>
                        </>
                    )}
                </View>
            </Modal>
        </View>
    );
}

// --- HELPER FUNCTIONS ---

function simulateBubbleDetection(totalQuestions) {
    const realShadedBubbles = {
        1: 'B', 2: 'A', 3: 'C', 4: 'D', 5: 'B',
        6: 'C', 7: 'C', 8: 'B', 9: 'C', 10: 'D',
        11: 'C', 12: 'D', 13: 'C', 14: 'B', 15: 'B',
        16: 'C', 17: 'D', 18: 'A', 19: 'C', 20: 'D',
        21: 'C', 22: 'B', 23: 'C', 24: 'C', 25: 'B',
        26: 'C', 27: 'D', 28: 'C', 29: 'C', 30: 'C',
        31: 'B', 32: 'C', 33: 'C', 34: 'B', 35: 'C',
        36: 'B', 37: 'C', 38: 'B', 39: 'D', 40: 'B',
        41: 'B', 42: 'B', 43: 'C', 44: 'B', 45: 'C',
        46: 'B', 47: 'C', 48: 'B', 49: 'B', 50: 'B'
    };

    const answers = {};
    for (let i = 1; i <= Math.min(totalQuestions, 50); i++) {
        answers[i] = realShadedBubbles[i] || '';
    }

    return answers;
}

function generateCSVContent(answers, filename) {
    const questionNumbers = Object.keys(answers).sort((a, b) => parseInt(a) - parseInt(b));
    
    let headerRow = 'Question Number';
    for (let i = 0; i < questionNumbers.length; i++) {
        headerRow += ',' + questionNumbers[i];
    }
    
    let answerRow = 'Answer';
    for (let i = 0; i < questionNumbers.length; i++) {
        const questionNum = questionNumbers[i];
        answerRow += ',' + answers[questionNum];
    }
    
    return headerRow + '\n' + answerRow + '\n';
}

// --- STYLES ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },

    // Explorer Header
    explorerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    explorerTitle: {
        fontSize: 22,
        fontFamily: 'Inter_700Bold',
        color: '#1E293B',
    },

    // Breadcrumb Navigation
    breadcrumbHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingVertical: 12,
        paddingHorizontal: 4,
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    breadcrumbContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    breadcrumbText: {
        fontSize: 18,
        fontFamily: 'Inter_600SemiBold',
        color: '#1E293B',
    },
    breadcrumbCount: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: '#64748B',
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        color: '#1E293B',
        marginTop: 24,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: '#64748B',
        textAlign: 'center',
    },

    // Empty Folder State
    emptyFolderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyFolderTitle: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        color: '#1E293B',
        marginTop: 20,
        marginBottom: 8,
    },
    emptyFolderText: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 24,
    },
    emptyFolderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#0038A8',
    },
    emptyFolderButtonText: {
        fontSize: 15,
        fontFamily: 'Inter_600SemiBold',
        color: '#0038A8',
    },

    // Stats Card
    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
        color: '#0038A8',
    },
    statLabel: {
        fontSize: 11,
        fontFamily: 'Inter_500Medium',
        color: '#64748B',
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 12,
    },

    // Folder Grid
    scrollView: {
        flex: 1,
    },
    folderGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    folderCard: {
        width: '47.5%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 12,
    },
    folderIconContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    folderBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#CE1126',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    folderBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontFamily: 'Inter_700Bold',
    },
    folderName: {
        fontSize: 15,
        fontFamily: 'Inter_600SemiBold',
        color: '#1E293B',
        marginBottom: 4,
        textAlign: 'center',
    },
    folderInfo: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: '#64748B',
    },

    // Image Grid
    imageGrid: {
        gap: 12,
        paddingBottom: 20,
    },

    // Image Card
    imageCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 1,
        marginBottom: 12,
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        position: 'relative',
        overflow: 'hidden',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoomIndicator: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 6,
        padding: 6,
    },
    imageInfo: {
        marginTop: 12,
        marginBottom: 12,
    },
    imageFilename: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        color: '#1E293B',
        marginBottom: 4,
    },
    imageDate: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: '#64748B',
    },

    // Action Buttons
    imageActions: {
        flexDirection: 'row',
        gap: 8,
    },
    convertButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0038A8',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 6,
    },
    convertButtonText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
    },
    viewButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: '#0038A8',
    },
    viewButtonText: {
        color: '#0038A8',
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
    },
    saveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#16A34A',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 6,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
    },
    deleteButton: {
        width: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FECACA',
    },

    // Full Screen Modal
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    modalImageInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 20,
        paddingBottom: 40,
    },
    modalImageFilename: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: '#fff',
        marginBottom: 4,
    },
    modalImageDate: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: '#CBD5E1',
    },

    // CSV Viewer Modal
    csvModalContainer: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: 50,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    csvModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    csvModalTitle: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        color: '#1E293B',
    },
    csvCloseButton: {
        padding: 4,
    },
    csvFilename: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        color: '#64748B',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
    },
    csvContentScroll: {
        flex: 1,
        paddingHorizontal: 20,
    },
    csvContent: {
        fontSize: 12,
        fontFamily: 'Courier',
        color: '#1E293B',
        paddingVertical: 12,
    },
    csvModalFooter: {
        padding: 20,
        backgroundColor: '#F8FAFC',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    csvHelpText: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: '#64748B',
        textAlign: 'center',
    },
});