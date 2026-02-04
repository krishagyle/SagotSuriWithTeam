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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { documentDirectory, writeAsStringAsync, deleteAsync } from 'expo-file-system/legacy';

/**
 * CSVFileManager Component
 * 
 * Displays saved exam paper images and converts them to CSV files.
 * Features:
 * - Display list of saved exam images
 * - Preview images
 * - Convert images to CSV (simulated bubble detection)
 * - Download/Share CSV files
 * - Delete saved images
 */
export default function CSVFileManager({ savedImages, onDeleteImage }) {
    // --- STATE MANAGEMENT ---
    const [processingImage, setProcessingImage] = useState(null);
    const [generatedCSVs, setGeneratedCSVs] = useState({});

    // --- HANDLERS ---

    /**
     * Convert exam paper image to CSV file
     * In production, this would use actual OCR/image processing
     */
    const handleConvertToCSV = async (imageData) => {
        setProcessingImage(imageData.uri);

        // Simulate processing delay
        setTimeout(async () => {
            try {
                // SIMULATION: Detect bubbles from image
                // In production, use OpenCV/Tesseract for actual detection
                const detectedAnswers = simulateBubbleDetection(50);

                // Generate CSV content
                const csvContent = generateCSVContent(detectedAnswers, imageData.filename);

                // Save CSV file
                const csvFilename = imageData.filename.replace(/\.(jpg|jpeg|png)$/i, '.csv');
                const csvUri = documentDirectory + csvFilename;

                await writeAsStringAsync(csvUri, csvContent, {
                    encoding: 'utf8',
                });

                // Store CSV info
                setGeneratedCSVs(prev => ({
                    ...prev,
                    [imageData.uri]: {
                        csvUri,
                        csvFilename,
                        timestamp: new Date().toISOString(),
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

        useEffect(() => {
        console.log('CSVFileManager - savedImages updated:', savedImages);
        console.log('CSVFileManager - Number of images:', savedImages?.length);
    }, [savedImages]);

    /**
     * Share/Download CSV file
     */
    const handleShareCSV = async (csvInfo) => {
        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(csvInfo.csvUri, {
                    mimeType: 'text/csv',
                    dialogTitle: 'Download CSV File',
                });
            } else {
                Alert.alert('Info', 'Sharing is not available on this device.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to share CSV file.');
            console.error(error);
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
                onPress: async () => {  // ← Add async here
                    try {
                        // Remove associated CSV if exists
                        if (generatedCSVs[imageData.uri]) {
                            const { csvUri } = generatedCSVs[imageData.uri];
                            await deleteAsync(csvUri, { idempotent: true });  // ← Add await here
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

    // Empty state
    if (!savedImages || savedImages.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={80} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Saved Exam Papers</Text>
                <Text style={styles.emptyText}>
                    Capture exam papers using the Scan tab to convert them to CSV files
                </Text>
            </View>
        );
    }

    // List of saved images
    return (
        <View style={styles.container}>
            {/* Header Stats */}
            <View style={styles.statsCard}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{savedImages.length}</Text>
                    <Text style={styles.statLabel}>Saved Images</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                        {Object.keys(generatedCSVs).length}
                    </Text>
                    <Text style={styles.statLabel}>CSV Files</Text>
                </View>
            </View>


            {/* Image List */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.imageGrid}>
                    {savedImages.map((imageData, index) => {
                        const csvInfo = generatedCSVs[imageData.uri];
                        const isProcessing = processingImage === imageData.uri;

                        return (
                            <View key={imageData.uri} style={styles.imageCard}>
                                {/* Image Preview */}
                                <View style={styles.imagePreview}>
                                    <Image
                                        source={{ uri: imageData.uri }}
                                        style={styles.thumbnailImage}
                                    />
                                    {isProcessing && (
                                        <View style={styles.processingOverlay}>
                                            <ActivityIndicator size="small" color="#fff" />
                                        </View>
                                    )}
                                </View>

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
                                        <TouchableOpacity
                                            style={styles.downloadButton}
                                            onPress={() => handleShareCSV(csvInfo)}
                                        >
                                            <Ionicons name="download-outline" size={16} color="#0038A8" />
                                            <Text style={styles.downloadButtonText}>Download CSV</Text>
                                        </TouchableOpacity>
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
        </View>
    );
}

// --- HELPER FUNCTIONS ---

/**
 * Simulate bubble detection from image
 * In production, replace with actual OCR (OpenCV/Tesseract)
 */
function simulateBubbleDetection(totalQuestions) {
    // Real shaded bubbles from exam paper (50 questions)
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

/**
 * Generate CSV content from detected answers - HORIZONTAL FORMAT
 */
function generateCSVContent(answers, filename) {
    // Get all question numbers and sort them numerically
    const questionNumbers = Object.keys(answers).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Build the header row (Question Number, 1, 2, 3, ...)
    let headerRow = 'Question Number';
    for (let i = 0; i < questionNumbers.length; i++) {
        headerRow += ',' + questionNumbers[i];
    }
    
    // Build the answer row (Answer, B, A, C, ...)
    let answerRow = 'Answer';
    for (let i = 0; i < questionNumbers.length; i++) {
        const questionNum = questionNumbers[i];
        answerRow += ',' + answers[questionNum];
    }
    
    // Combine with newline
    return headerRow + '\n' + answerRow + '\n';
}

// --- STYLES ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
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

    // Stats Card
    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
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
        fontSize: 28,
        fontFamily: 'Inter_700Bold',
        color: '#0038A8',
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'Inter_500Medium',
        color: '#64748B',
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 16,
    },

    // Image Grid
    scrollView: {
        flex: 1,
    },
    imageGrid: {
        gap: 12,
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
    downloadButton: {
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
    downloadButtonText: {
        color: '#0038A8',
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
});