import { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import Logo from './components/Logo';
import {
    useFonts,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
} from '@expo-google-fonts/inter';
import CSVFileManager from './screens/CSVFileManager';
import ExamScanner from './screens/ExamScanner';
import ResultsDisplay from './screens/ResultsDisplay';
import { deleteAsync } from 'expo-file-system/legacy';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function App() {
    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState('scan');
    const [savedImages, setSavedImages] = useState([]);
    const [scanResult, setScanResult] = useState(null);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [appIsReady, setAppIsReady] = useState(false);

    // --- FONT LOADING ---
    let [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    // --- LOAD RESOURCES ---
    useEffect(() => {
        async function prepare() {
            try {
                // Load saved images
                await loadSavedImages();
                
                // Wait for fonts
                while (!fontsLoaded) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                // Optional: Add minimum display time for splash
                await new Promise(resolve => setTimeout(resolve, 1500));
                
            } catch (e) {
                console.warn('Error loading resources:', e);
            } finally {
                setAppIsReady(true);
            }
        }

        prepare();
    }, [fontsLoaded]);

    // --- HIDE SPLASH SCREEN ---
    const onLayoutRootView = useCallback(async () => {
        if (appIsReady) {
            await SplashScreen.hideAsync();
        }
    }, [appIsReady]);

    // --- PERSISTENCE FUNCTIONS ---
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
    const handleImageSaved = (imageData) => {
        console.log('📸 Image saved:', imageData);
        setSavedImages(prev => {
            const updated = [...prev, imageData];
            console.log('📋 Updated savedImages array:', updated);
            console.log('📊 Total images:', updated.length);
            return updated;
        });
        setActiveTab('csv-file');
    };

    const handleDeleteImage = async (imageData) => {
        try {
            console.log('🗑️ Deleting image:', imageData.uri);
            await deleteAsync(imageData.uri, { idempotent: true });
            console.log('✅ Image deleted from file system');
            
            setSavedImages(prev => {
                const updated = prev.filter(img => img.uri !== imageData.uri);
                console.log('📋 Updated savedImages after deletion. Count:', updated.length);
                return updated;
            });
        } catch (error) {
            console.error('❌ Error deleting image:', error);
        }
    };

    const handleScanComplete = (result) => {
        console.log('✅ Scan complete:', result);
        setScanResult(result);
        setActiveTab('results');
    };

    // --- SHOW SPLASH SCREEN ---
    if (!appIsReady) {
        return (
            <View style={styles.splashContainer}>
                <Logo size={150} animated={true} />
                <Text style={styles.splashText}>SagotSuri</Text>
                <Text style={styles.splashSubtext}>
                    Mabilis at awtomatikong pagsusuri
                </Text>
            </View>
        );
    }

    // --- MAIN APP RENDER ---
    return (
        <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
            <StatusBar style="light" />

            {/* HEADER */}
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <Logo size={42} />
                </View>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>SagotSuri</Text>
                    <Text style={styles.headerSubtitle}>
                        Mabilis at awtomatikong pagsusuri ng mga sagot
                    </Text>
                </View>
            </View>

            {/* NAVIGATION TABS */}
            <View style={styles.tabBar}>
                <TabButton
                    title="Scan"
                    icon="scan-outline"
                    isActive={activeTab === 'scan'}
                    onPress={() => setActiveTab('scan')}
                />
                <TabButton
                    title="CSV File"
                    icon="document-text-outline"
                    isActive={activeTab === 'csv-file'}
                    onPress={() => setActiveTab('csv-file')}
                    badge={savedImages.length > 0 ? savedImages.length : null}
                />
                <TabButton
                    title="Results"
                    icon="stats-chart-outline"
                    isActive={activeTab === 'results'}
                    onPress={() => setActiveTab('results')}
                />
            </View>

            {/* MAIN CONTENT */}
            <View style={styles.contentContainer}>
                <View style={styles.card}>
                    {activeTab === 'scan' && (
                        <ExamScanner
                            onScanComplete={handleScanComplete}
                            onImageSaved={handleImageSaved}
                        />
                    )}
                    {activeTab === 'csv-file' && (
                        <CSVFileManager
                            savedImages={savedImages}
                            onDeleteImage={handleDeleteImage}
                        />
                    )}
                    {activeTab === 'results' && (
                        <ResultsDisplay result={scanResult} />
                    )}
                </View>
                <Text style={styles.footerText}>© 2026 Exam Paper Scanner App</Text>
            </View>
        </SafeAreaView>
    );
}

// --- HELPER COMPONENTS ---
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
    container: {
        flex: 1,
        backgroundColor: '#F1F5F9',
    },
    splashContainer: {
        flex: 1,
        backgroundColor: '#0038A8',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    splashText: {
        fontSize: 32,
        fontFamily: 'Inter_700Bold',
        color: '#fff',
        marginTop: 30,
        letterSpacing: -0.5,
    },
    splashSubtext: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: 'rgba(255,255,255,0.85)',
        marginTop: 8,
        textAlign: 'center',
    },
    header: {
        backgroundColor: '#0038A8',
        paddingTop: 8,
        paddingBottom: 24,
        paddingHorizontal: 24,
        marginBottom: 30,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 16,
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
        padding: 2,
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
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginHorizontal: 16,
        marginTop: -20,
        borderRadius: 12,
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
        backgroundColor: '#FEF2F2',
    },
    tabContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        position: 'relative',
    },
    tabText: {
        fontSize: 12,
        color: '#94A3B8',
        fontFamily: 'Inter_500Medium',
    },
    activeTabText: {
        color: '#CE1126',
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
    contentContainer: {
        flex: 1,
        padding: 16,
        paddingTop: 32,
    },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 0,
        overflow: 'hidden',
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 10,
    },
    footerText: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        marginTop: 8,
    },
});