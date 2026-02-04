import { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * AnswerKeyManager Component
 * 
 * Allows teachers to create and save answer keys for exams.
 * Features:
 * - Set number of questions (1-100)
 * - Select answer for each question (A, B, C, D)
 * - Save answer key to state
 * - Visual feedback for selected answers
 */
export default function AnswerKeyManager({ answerKey, setAnswerKey }) {
    // --- LOCAL STATE ---
    const [numberOfQuestions, setNumberOfQuestions] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);

    // --- HANDLERS ---

    /**
     * Initialize the answer key grid based on number of questions
     */
    const handleConfigureQuestions = () => {
        const num = parseInt(numberOfQuestions);

        // Validation
        if (isNaN(num) || num < 1 || num > 100) {
            Alert.alert('Invalid Input', 'Please enter a number between 1 and 100');
            return;
        }

        // Initialize empty answer key
        const initialKey = {};
        for (let i = 1; i <= num; i++) {
            initialKey[i] = answerKey[i] || ''; // Keep existing answers if any
        }

        setAnswerKey(initialKey);
        setIsConfigured(true);
    };

    /**
     * Set the answer for a specific question number
     */
    const handleSetAnswer = (questionNumber, answer) => {
        setAnswerKey({
            ...answerKey,
            [questionNumber]: answer,
        });
    };

    /**
     * Save the answer key (for now just shows confirmation)
     */
    const handleSaveAnswerKey = () => {
        const totalQuestions = Object.keys(answerKey).length;
        const answeredQuestions = Object.values(answerKey).filter(a => a !== '').length;

        if (answeredQuestions === 0) {
            Alert.alert('No Answers', 'Please set at least one answer before saving.');
            return;
        }

        Alert.alert(
            'Answer Key Saved',
            `Successfully saved ${answeredQuestions} out of ${totalQuestions} answers.`,
            [{ text: 'OK' }]
        );
    };

    /**
     * Reset the answer key configuration
     */
    const handleReset = () => {
        Alert.alert(
            'Reset Answer Key',
            'Are you sure you want to reset? All answers will be cleared.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                        setAnswerKey({});
                        setIsConfigured(false);
                        setNumberOfQuestions('');
                    },
                },
            ]
        );
    };

    // --- RENDER ---

    // Step 1: Configure number of questions
    if (!isConfigured) {
        return (
            <View style={styles.container}>
                <View style={styles.setupCard}>
                    <Ionicons name="create-outline" size={64} color="#0038A8" />
                    <Text style={styles.setupTitle}>Setup Answer Key</Text>
                    <Text style={styles.setupDescription}>
                        Enter the number of questions in the exam
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Number of Questions (1-100)"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={numberOfQuestions}
                        onChangeText={setNumberOfQuestions}
                        maxLength={3}
                    />

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleConfigureQuestions}
                    >
                        <Text style={styles.primaryButtonText}>Create Answer Key</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Step 2: Answer key grid
    const questions = Object.keys(answerKey).map(Number).sort((a, b) => a - b);
    const answeredCount = Object.values(answerKey).filter(a => a !== '').length;

    return (
        <View style={styles.container}>
            {/* Header Stats */}
            <View style={styles.statsCard}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{questions.length}</Text>
                    <Text style={styles.statLabel}>Questions</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{answeredCount}</Text>
                    <Text style={styles.statLabel}>Answered</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                        {questions.length - answeredCount}
                    </Text>
                    <Text style={styles.statLabel}>Remaining</Text>
                </View>
            </View>

            {/* Answer Grid */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.gridContainer}>
                    {questions.map((questionNumber) => (
                        <QuestionItem
                            key={questionNumber}
                            questionNumber={questionNumber}
                            selectedAnswer={answerKey[questionNumber]}
                            onSelectAnswer={handleSetAnswer}
                        />
                    ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSaveAnswerKey}
                    >
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.saveButtonText}>Save Answer Key</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                        <Ionicons name="refresh" size={20} color="#CE1126" />
                        <Text style={styles.resetButtonText}>Reset</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

/**
 * Individual Question Item Component
 * Shows question number and answer options A, B, C, D
 */
const QuestionItem = ({ questionNumber, selectedAnswer, onSelectAnswer }) => {
    const options = ['A', 'B', 'C', 'D'];

    return (
        <View style={styles.questionCard}>
            <Text style={styles.questionNumber}>Q{questionNumber}</Text>
            <View style={styles.optionsRow}>
                {options.map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.optionButton,
                            selectedAnswer === option && styles.optionButtonSelected,
                        ]}
                        onPress={() => onSelectAnswer(questionNumber, option)}
                    >
                        <Text
                            style={[
                                styles.optionText,
                                selectedAnswer === option && styles.optionTextSelected,
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

// --- STYLES ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },

    // Setup Screen Styles
    setupCard: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    setupTitle: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
        color: '#1E293B',
        marginTop: 24,
    },
    setupDescription: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 32,
    },
    input: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        fontFamily: 'Inter_500Medium',
        color: '#1E293B',
        textAlign: 'center',
        marginBottom: 24,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0038A8',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        gap: 8,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
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

    // Grid Styles
    scrollView: {
        flex: 1,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },

    // Question Card
    questionCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 1,
    },
    questionNumber: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        color: '#475569',
        marginBottom: 8,
    },
    optionsRow: {
        flexDirection: 'row',
        gap: 6,
    },
    optionButton: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionButtonSelected: {
        backgroundColor: '#0038A8',
        borderColor: '#0038A8',
    },
    optionText: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        color: '#64748B',
    },
    optionTextSelected: {
        color: '#fff',
    },

    // Action Buttons
    actionButtons: {
        marginTop: 24,
        marginBottom: 16,
        gap: 12,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0038A8',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
    },
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    resetButtonText: {
        color: '#CE1126',
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
    },
});
