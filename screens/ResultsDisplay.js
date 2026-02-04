import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * ResultsDisplay Component
 * 
 * Displays exam results with detailed analysis:
 * - Overall score and percentage
 * - Question-by-question breakdown
 * - Correct/incorrect answer comparison
 * - Visual indicators for performance
 */
export default function ResultsDisplay({ result, answerKey }) {
    // --- NO RESULTS STATE ---
    if (!result) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={80} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Results Yet</Text>
                <Text style={styles.emptyText}>
                    Scan an exam paper to see the results here
                </Text>
            </View>
        );
    }

    // --- CALCULATE PERFORMANCE DATA ---
    const { studentAnswers, correctAnswers, totalQuestions, score } = result;
    const incorrectAnswers = totalQuestions - correctAnswers;
    const percentage = score.toFixed(1);

    // Determine performance level and color
    let performanceLevel = '';
    let performanceColor = '';

    if (score >= 90) {
        performanceLevel = 'Excellent';
        performanceColor = '#10B981'; // Green
    } else if (score >= 75) {
        performanceLevel = 'Good';
        performanceColor = '#3B82F6'; // Blue
    } else if (score >= 60) {
        performanceLevel = 'Satisfactory';
        performanceColor = '#F59E0B'; // Orange
    } else {
        performanceLevel = 'Needs Improvement';
        performanceColor = '#EF4444'; // Red
    }

    // Generate questions array sorted by number
    const questions = Object.keys(answerKey)
        .map(Number)
        .sort((a, b) => a - b);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Score Card */}
            <View style={styles.scoreCard}>
                <View style={styles.scoreHeader}>
                    <Ionicons name="trophy" size={32} color="#F59E0B" />
                    <Text style={styles.scoreTitle}>Exam Results</Text>
                </View>

                {/* Large Score Display */}
                <View style={styles.scoreCircle}>
                    <Text style={[styles.scorePercentage, { color: performanceColor }]}>
                        {percentage}%
                    </Text>
                    <Text style={styles.scoreLabel}>{performanceLevel}</Text>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        <Text style={styles.statNumber}>{correctAnswers}</Text>
                        <Text style={styles.statLabel}>Correct</Text>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statBox}>
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                        <Text style={styles.statNumber}>{incorrectAnswers}</Text>
                        <Text style={styles.statLabel}>Incorrect</Text>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statBox}>
                        <Ionicons name="document-text" size={24} color="#6366F1" />
                        <Text style={styles.statNumber}>{totalQuestions}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                </View>
            </View>

            {/* Question Breakdown Header */}
            <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownTitle}>Question Breakdown</Text>
                <Text style={styles.breakdownSubtitle}>
                    Tap any question to see details
                </Text>
            </View>

            {/* Questions List */}
            <View style={styles.questionsList}>
                {questions.map((questionNum) => {
                    const correctAnswer = answerKey[questionNum];
                    const studentAnswer = studentAnswers[questionNum] || '-';
                    const isCorrect = studentAnswer === correctAnswer;
                    const isBlank = !studentAnswers[questionNum];

                    return (
                        <QuestionResultItem
                            key={questionNum}
                            questionNumber={questionNum}
                            correctAnswer={correctAnswer}
                            studentAnswer={studentAnswer}
                            isCorrect={isCorrect}
                            isBlank={isBlank}
                        />
                    );
                })}
            </View>

            {/* Space at bottom for better scrolling */}
            <View style={{ height: 20 }} />
        </ScrollView>
    );
}

/**
 * Individual Question Result Item
 */
const QuestionResultItem = ({
    questionNumber,
    correctAnswer,
    studentAnswer,
    isCorrect,
    isBlank,
}) => {
    return (
        <View
            style={[
                styles.questionItem,
                isCorrect && styles.questionItemCorrect,
                !isCorrect && !isBlank && styles.questionItemIncorrect,
                isBlank && styles.questionItemBlank,
            ]}
        >
            <View style={styles.questionLeft}>
                <Text style={styles.questionNumber}>Q{questionNumber}</Text>
            </View>

            <View style={styles.questionMiddle}>
                <View style={styles.answerRow}>
                    <Text style={styles.answerLabel}>Student:</Text>
                    <View
                        style={[
                            styles.answerBubble,
                            isCorrect && styles.answerBubbleCorrect,
                            !isCorrect && !isBlank && styles.answerBubbleIncorrect,
                            isBlank && styles.answerBubbleBlank,
                        ]}
                    >
                        <Text
                            style={[
                                styles.answerText,
                                isCorrect && styles.answerTextCorrect,
                                !isCorrect && !isBlank && styles.answerTextIncorrect,
                            ]}
                        >
                            {studentAnswer}
                        </Text>
                    </View>
                </View>

                {!isCorrect && (
                    <View style={styles.answerRow}>
                        <Text style={styles.answerLabel}>Correct:</Text>
                        <View style={styles.answerBubbleCorrect}>
                            <Text style={styles.answerTextCorrect}>{correctAnswer}</Text>
                        </View>
                    </View>
                )}
            </View>

            <View style={styles.questionRight}>
                {isCorrect && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                {!isCorrect && !isBlank && <Ionicons name="close-circle" size={24} color="#EF4444" />}
                {isBlank && <Ionicons name="help-circle" size={24} color="#94A3B8" />}
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

    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        color: '#1E293B',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: '#64748B',
        textAlign: 'center',
    },

    // Score Card
    scoreCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        marginBottom: 16,
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    scoreHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    scoreTitle: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        color: '#1E293B',
    },
    scoreCircle: {
        alignItems: 'center',
        marginBottom: 24,
    },
    scorePercentage: {
        fontSize: 56,
        fontFamily: 'Inter_700Bold',
        lineHeight: 64,
    },
    scoreLabel: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: '#64748B',
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
    },
    statNumber: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
        color: '#1E293B',
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'Inter_500Medium',
        color: '#64748B',
    },
    statDivider: {
        width: 1,
        height: 60,
        backgroundColor: '#E2E8F0',
    },

    // Breakdown Section
    breakdownHeader: {
        marginBottom: 12,
    },
    breakdownTitle: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
        color: '#1E293B',
        marginBottom: 4,
    },
    breakdownSubtitle: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: '#64748B',
    },

    // Questions List
    questionsList: {
        gap: 8,
    },
    questionItem: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    questionItemCorrect: {
        borderColor: '#D1FAE5',
        backgroundColor: '#F0FDF4',
    },
    questionItemIncorrect: {
        borderColor: '#FEE2E2',
        backgroundColor: '#FEF2F2',
    },
    questionItemBlank: {
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },
    questionLeft: {
        width: 50,
    },
    questionNumber: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        color: '#475569',
    },
    questionMiddle: {
        flex: 1,
        gap: 6,
    },
    answerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    answerLabel: {
        fontSize: 12,
        fontFamily: 'Inter_500Medium',
        color: '#64748B',
        width: 60,
    },
    answerBubble: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        minWidth: 36,
        alignItems: 'center',
    },
    answerBubbleCorrect: {
        backgroundColor: '#10B981',
    },
    answerBubbleIncorrect: {
        backgroundColor: '#EF4444',
    },
    answerBubbleBlank: {
        backgroundColor: '#E2E8F0',
    },
    answerText: {
        fontSize: 14,
        fontFamily: 'Inter_700Bold',
    },
    answerTextCorrect: {
        color: '#fff',
    },
    answerTextIncorrect: {
        color: '#fff',
    },
    questionRight: {
        width: 40,
        alignItems: 'flex-end',
    },
});
