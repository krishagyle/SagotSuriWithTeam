import { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    TextInput,
    Alert,
    Image,
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

const DepEdLogo = require('./assets/deped.png');

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function App() {
    // ---------- SETUP STATE ----------
    const [isSetupDone, setIsSetupDone] = useState(false);
    const [grade, setGrade] = useState('');
    const [section, setSection] = useState('');
    const [teacherName, setTeacherName] = useState('');

    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState('scan');
    const [savedImages, setSavedImages] = useState([]);
    const [folders, setFolders] = useState([
        { id: 'default', name: 'General', imageCount: 0 },
    ]);
    const [scanResult, setScanResult] = useState(null);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [foldersLoaded, setFoldersLoaded] = useState(false);
    const [appIsReady, setAppIsReady] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);


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
                // Load saved images and folders
                await Promise.all([
                    loadSavedImages(),
                    loadFolders(),
                ]);
                
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

    const loadFolders = async () => {
        try {
            const savedFolders = await AsyncStorage.getItem('folders');
            if (savedFolders) {
                const parsedFolders = JSON.parse(savedFolders);
                console.log('✅ Loaded folders from storage:', parsedFolders);
                setFolders(parsedFolders);
            } else {
                console.log('ℹ️ No folders found, using default');
            }
        } catch (error) {
            console.error('❌ Error loading folders:', error);
        } finally {
            setFoldersLoaded(true);
        }
    };

    // Save images when they change
    useEffect(() => {
        if (imagesLoaded) {
            saveSavedImages();
            updateFolderCounts();
        }
    }, [savedImages, imagesLoaded]);

    // Save folders when they change
    useEffect(() => {
        if (foldersLoaded) {
            saveFolders();
        }
    }, [folders, foldersLoaded]);

    const saveSavedImages = async () => {
        try {
            await AsyncStorage.setItem('savedImages', JSON.stringify(savedImages));
            console.log('💾 Saved images to AsyncStorage. Count:', savedImages.length);
        } catch (error) {
            console.error('❌ Error saving images to storage:', error);
        }
    };

    const saveFolders = async () => {
        try {
            await AsyncStorage.setItem('folders', JSON.stringify(folders));
            console.log('💾 Saved folders to AsyncStorage. Count:', folders.length);
        } catch (error) {
            console.error('❌ Error saving folders to storage:', error);
        }
    };

    // Update folder image counts
    const updateFolderCounts = () => {
        setFolders(prevFolders => 
            prevFolders.map(folder => ({
                ...folder,
                imageCount: savedImages.filter(img => img.folderId === folder.id).length
            }))
        );
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

    const handleCreateFolder = (folderName) => {
        const newFolder = {
            id: `folder_${Date.now()}`,
            name: folderName,
            imageCount: 0,
        };
        
        setFolders(prev => [...prev, newFolder]);
        console.log('📁 New folder created:', newFolder);
    };

    const handleScanComplete = (result) => {
        console.log('✅ Scan complete:', result);
        setScanResult(result);
        setActiveTab('results');
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes',
                onPress: () => {
                    setIsSetupDone(false);
                    setGrade('');
                    setSection('');
                    setTeacherName('');
                    setActiveTab('scan');
                },
            },
        ]);
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

    // ---------- LOGIN / SETUP SCREEN ----------
    if (!isSetupDone) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F1F5F9' }} onLayout={onLayoutRootView}>
                <View style={styles.setupContainer}>
                    
                    {/* OVERSIZED LOGO - MATAAS NA POSISYON */}
                    <View style={styles.oversizedLogoContainer}>
                        <Image 
                            source={DepEdLogo} 
                            style={styles.bigLogo} 
                            resizeMode="contain" 
                            marginBottom={30}
                        />
                    </View>

                    {/* FORM CARD */}
                    <View style={styles.setupCard}>
                        <Text style={styles.setupTitle}>Class Information</Text>

                        <TextInput
                            placeholder="Grade"
                            placeholderTextColor="#94A3B8"
                            style={styles.input}
                            value={grade}
                            onChangeText={setGrade}
                        />

                        <TextInput
                            placeholder="Section"
                            placeholderTextColor="#94A3B8"
                            style={styles.input}
                            value={section}
                            onChangeText={setSection}
                        />

                        <TextInput
                            placeholder="Teacher Name"
                            placeholderTextColor="#94A3B8"
                            style={styles.input}
                            value={teacherName}
                            onChangeText={setTeacherName}
                        />

                        <TouchableOpacity
                            style={[
                                styles.continueButton,
                                (!grade || !section || !teacherName) && { opacity: 0.5 },
                            ]}
                            disabled={!grade || !section || !teacherName}
                            onPress={() => setIsSetupDone(true)}
                        >
                            <Text style={styles.continueText}>Continue</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // --- MAIN APP RENDER ---
    return (
        <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
            <StatusBar style="light" />

            {/* HEADER */}
            <View style={styles.header}>
                {/* LEFT SIDE */}
                <View style={styles.headerLeft}>
                    <View style={styles.logoContainer}>
                        <Logo size={40} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>SagotSuri</Text>
                        <Text style={styles.headerSubtitle}>
                            {teacherName} • Grade {grade} - {section}
                        </Text>
                    </View>
                </View>

                {/* RIGHT SIDE */}
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => setMenuVisible(prev => !prev)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="menu" size={26} color="#fff" />
                    </TouchableOpacity>

                    {menuVisible && (
                        <View style={styles.dropdownMenu}>
                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => {
                                    setMenuVisible(false);
                                    handleLogout();
                                }}
                            >
                                <Ionicons name="log-out-outline" size={18} color="#CE1126" />
                                <Text style={styles.dropdownText}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>


            {/* LOGOUT BUTTON */}


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
                            folders={folders}
                            onCreateFolder={handleCreateFolder}
                        />
                    )}
                    {activeTab === 'csv-file' && (
                        <CSVFileManager
                            savedImages={savedImages}
                            onDeleteImage={handleDeleteImage}
                            folders={folders}
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
                size={18}
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

    // Setup Screen Styles
    setupContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F1F5F9',
    },
    oversizedLogoContainer: {
        marginBottom: -15,
        zIndex: 10,
        elevation: 11, 
    },
    bigLogo: {
        width: 180,
        height: 180,
    },
    setupCard: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#fff',
        borderRadius: 30,
        padding: 24,
        paddingTop: 45,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    setupTitle: {
        fontSize: 22,
        fontFamily: 'Inter_700Bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#0038A8',
    },
    input: {
        backgroundColor: '#F8FAFC',
        padding: 15,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        fontSize: 16,
        color: '#1E293B',
        fontFamily: 'Inter_400Regular',
    },
    continueButton: {
        backgroundColor: '#CE1126',
        padding: 16,
        borderRadius: 12,
        marginTop: 10,
    },
    continueText: {
        color: '#fff',
        textAlign: 'center',
        fontFamily: 'Inter_700Bold',
        fontSize: 16,
    },

    // Dashboard Header Styles
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 50,
        backgroundColor: '#0038A8',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerRight: {
    position: 'relative',
    },

    menuButton: {
        padding: 6,
    },

    dropdownMenu: {
        position: 'absolute',
        top: 40,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 8,
        width: 150,

        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },

    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
    },

    dropdownText: {
        fontFamily: 'Inter_600SemiBold',
        color: '#CE1126',
    },

    logoContainer: {
        backgroundColor: '#fff',
        padding: 4,
        borderRadius: 10,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
    },
    headerSubtitle: {
        color: '#E5E7EB',
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
    },
    logoutRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 50,
        paddingTop: 10,
    },
    logoutText: {
        color: '#CE1126',
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        margin: 16,
        borderRadius: 15,
        elevation: 2,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
    },
    activeTab: {
        backgroundColor: '#FEF2F2',
        borderRadius: 15,
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
        position: 'absolute',
        top: -8,
        right: -12,
        backgroundColor: '#CE1126',
        borderRadius: 10,
        paddingHorizontal: 5,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Inter_700Bold',
    },
    contentContainer: {
        flex: 1,
        padding: 16,
        paddingTop: 0,
    },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
    },
    footerText: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        marginTop: 8,
    },
});