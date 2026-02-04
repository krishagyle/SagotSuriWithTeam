import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
// Icon set from Expo
import { Ionicons } from '@expo/vector-icons';
// AsyncStorage for persistence
import AsyncStorage from '@react-native-async-storage/async-storage';
// File System for image deletion
import * as FileSystem from 'expo-file-system';
// Custom Logo Component
import Logo from './components/Logo';
// Custom Fonts
import {
    useFonts,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
} from '@expo-google-fonts/inter';
// Screens
import CSVFileManager from './screens/CSVFileManager';
import ExamScanner from './screens/ExamScanner';
import ResultsDisplay from './screens/ResultsDisplay';
import { deleteAsync } from 'expo-file-system/legacy';

export default function App() {
    // --- STATE MANAGEMENT ---
    // Controls which tab is currently visible
    const [activeTab, setActiveTab] = useState('scan');
    // Stores saved exam paper images
    const [savedImages, setSavedImages] = useState([]);
    // Stores the result of the scanned paper
    const [scanResult, setScanResult] = useState(null);
    // Track if images are loaded from storage
    const [imagesLoaded, setImagesLoaded] = useState(false);

    // --- FONT LOADING ---
    // Asynchronously load the Inter font family
    let [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    // --- PERSISTENCE FUNCTIONS ---
    
    // Load saved images from AsyncStorage on app start
    useEffect(() => {
        loadSavedImages();
    }, []);

    const loadSavedImages = async () => {
        try {
            const savedData = await AsyncStorage.getItem('savedImages');
            if (savedData) {
                const images = JSON.parse(savedData);
                console.log('✅ Loaded saved images from storage:', images);
                setSavedImages(images);
            } else {
                console.log('ℹ️ No saved images found in storage');
            }
        } catch (error) {
            console.error('❌ Error loading saved images:', error);
        } finally {
            setImagesLoaded(true);
        }
    };

    // Save to AsyncStorage whenever savedImages changes
    useEffect(() => {
        if (imagesLoaded) {
            saveSavedImages();
        }
    }, [savedImages, imagesLoaded]);

    const saveSavedImages = async () => {
        try {
            await AsyncStorage.setItem('savedImages', JSON.stringify(savedImages));
            console.log('💾 Saved images to AsyncStorage. Count:', savedImages.length);
        } catch (error) {
            console.error('❌ Error saving images to storage:', error);
        }
    };

    // --- HANDLERS ---
    
    // Called when an image is saved from scanner
    const handleImageSaved = (imageData) => {
        console.log('📸 Image saved:', imageData);
        setSavedImages(prev => {
            const updated = [...prev, imageData];
            console.log('📋 Updated savedImages array:', updated);
            console.log('📊 Total images:', updated.length);
            return updated;
        });
        // Switch to CSV File tab to show the saved image
        setActiveTab('csv-file');
    };

    // Called when an image is deleted
    const handleDeleteImage = async (imageData) => {
        try {
            console.log('🗑️ Deleting image:', imageData.uri);
            
            // Delete from file system
            // In handleDeleteImage
            await deleteAsync(imageData.uri, { idempotent: true });
            console.log('✅ Image deleted from file system');
            
            // Update state
            setSavedImages(prev => {
                const updated = prev.filter(img => img.uri !== imageData.uri);
                console.log('📋 Updated savedImages after deletion. Count:', updated.length);
                return updated;
            });
        } catch (error) {
            console.error('❌ Error deleting image:', error);
        }
    };

    // Called when scanning is finished to switch to results view
    const handleScanComplete = (result) => {
        console.log('✅ Scan complete:', result);
        setScanResult(result);
        setActiveTab('results');
    };

    // --- LOADING STATE ---
    // Show a loading spinner while fonts and images are being loaded
    if (!fontsLoaded || !imagesLoaded) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0038A8" />
                <Text style={styles.loadingText}>
                    {!fontsLoaded ? 'Loading fonts...' : 'Loading images...'}
                </Text>
            </View>
        );
    }

    // --- MAIN RENDER ---
    return (
        <SafeAreaView style={styles.container}>
            {/* Status Bar: Sets the text color of the clock/battery to white */}
            <StatusBar style="light" />

            {/* ================= HEADER SECTION ================= */}
            <View style={styles.header}>
                {/* Logo Container with shadow */}
                <View style={styles.logoContainer}>
                    <Logo size={42} />
                </View>

                {/* Title Text Area */}
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>SagotSuri</Text>
                    <Text style={styles.headerSubtitle}>
                        Mabilis at awtomatikong pagsusuri ng mga sagot
                    </Text>
                </View>
            </View>

            {/* ================= NAVIGATION TABS ================= */}
            <View style={styles.tabBar}>
                {/* Tab 1: Scan */}
                <TabButton
                    title="Scan"
                    icon="scan-outline"
                    isActive={activeTab === 'scan'}
                    onPress={() => setActiveTab('scan')}
                />

                {/* Tab 2: CSV File */}
                <TabButton
                    title="CSV File"
                    icon="document-text-outline"
                    isActive={activeTab === 'csv-file'}
                    onPress={() => setActiveTab('csv-file')}
                    badge={savedImages.length > 0 ? savedImages.length : null}
                />

                {/* Tab 3: Results */}
                <TabButton
                    title="Results"
                    icon="stats-chart-outline"
                    isActive={activeTab === 'results'}
                    onPress={() => setActiveTab('results')}
                />
            </View>

            {/* ================= MAIN CONTENT AREA ================= */}
            {/* The content is wrapped in a Card for a premium feel */}
            <View style={styles.contentContainer}>
                <View style={styles.card}>
                    {/* Scan Screen */}
                    {activeTab === 'scan' && (
                        <ExamScanner
                            onScanComplete={handleScanComplete}
                            onImageSaved={handleImageSaved}
                        />
                    )}

                    {/* CSV File Manager Screen */}
                    {activeTab === 'csv-file' && (
                        <CSVFileManager
                            savedImages={savedImages}
                            onDeleteImage={handleDeleteImage}
                        />
                    )}

                    {/* Results Screen */}
                    {activeTab === 'results' && (
                        <ResultsDisplay
                            result={scanResult}
                        />
                    )}
                </View>

                {/* Footer / Copyright */}
                <Text style={styles.footerText}>© 2026 Exam Paper Scanner App</Text>
            </View>
        </SafeAreaView>
    );
}

// --- HELPER COMPONENTS ---

// 1. Reusable Tab Button Component
const TabButton = ({ title, icon, isActive, onPress, badge }) => (
    <TouchableOpacity
        onPress={onPress}
        style={[styles.tab, isActive && styles.activeTab]}
        activeOpacity={0.7}
    >
        <View style={styles.tabContent}>
            <Ionicons
                name={icon}
                size={20}
                color={isActive ? '#CE1126' : '#94A3B8'}
            />
            <Text
                style={[styles.tabText, isActive && styles.activeTabText]}
                numberOfLines={1}
            >
                {title}
            </Text>
            {badge && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                </View>
            )}
        </View>
    </TouchableOpacity>
);


// --- STYLESHEET ---
const styles = StyleSheet.create({
    // Main Container
    container: {
        flex: 1,
        backgroundColor: '#F1F5F9', // Slate-100: A soft, modern gray background
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        gap: 16,
    },
    loadingText: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: '#64748B',
        marginTop: 8,
    },

    // Header Styles
    header: {
        backgroundColor: '#0038A8', // DepEd Blue
        paddingTop: 8, // Minimal padding (SafeAreaView handles safe area)
        paddingBottom: 24,
        paddingHorizontal: 24,
        marginBottom: 30,
        flexDirection: 'row',
        alignItems: 'flex-end', // Align items to bottom of header
        gap: 16,
        // Add subtle shadow
        shadowColor: '#0038A8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 10,
    },
    logoContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 2, // Border effect
        marginBottom: 20,
    },
    headerTextContainer: {
        flex: 1,
        marginTop: 30,
    },
    headerTitle: {
        fontSize: 24,
        color: '#fff',
        fontFamily: 'Inter_700Bold',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 2,
        fontFamily: 'Inter_400Regular',
        lineHeight: 18,
    },

    // Tab Bar Styles
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginHorizontal: 16,
        marginTop: -20, // Negative margin to overlap header (floating effect)
        borderRadius: 12,
        // Floating Shadow Effect
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
        zIndex: 20,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#FEF2F2', // Very light red background for active state
    },
    tabContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        position: 'relative',
    },
    tabText: {
        fontSize: 12,
        color: '#94A3B8', // Slate-400
        fontFamily: 'Inter_500Medium',
    },
    activeTabText: {
        color: '#CE1126', // DepEd Red
        fontFamily: 'Inter_700Bold',
    },
    badge: {
        backgroundColor: '#CE1126',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
        position: 'absolute',
        top: -8,
        right: -12,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Inter_700Bold',
    },

    // Content Area Styles
    contentContainer: {
        flex: 1,
        padding: 16,
        paddingTop: 32, // Increased to prevent overlap with floating tab bar
    },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 0, // Remove padding to let screens handle their own spacing
        overflow: 'hidden', // Prevent content from bleeding outside rounded corners
        // Card Shadow
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 10,
    },

    // Footer
    footerText: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        marginTop: 8,
    },
});