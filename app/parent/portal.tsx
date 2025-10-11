import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Heart,
  User,
  Utensils,
  AlertCircle,
  MessageSquare,
  Star,
  LogOut,
  ArrowLeft,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { StudentProfile } from '@/types';
import {
  getParentSession,
  logoutParent
} from '@/services/parent/parentAuthService';
import {
  refreshStudentData,
  getTodayMealInfo,
  getTodayDonorInfo,
  getTodayMealFromStock,
  getDonorIdByName,
  updateAllergiesAndFeedback,
  TodayMealInfo,
  DonorInfo,
  TodayMealStock
} from '@/services/parent/parentDataService';
import { submitDonorRating } from '@/services/parent/parentRatingService';

export default function ParentPortalScreen() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [teacherId, setTeacherId] = useState('');
  const [studentKey, setStudentKey] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [allergies, setAllergies] = useState('');
  const [mealFeedback, setMealFeedback] = useState('');

  const [todayMeal, setTodayMeal] = useState<TodayMealInfo | null>(null);
  const [todayMealStock, setTodayMealStock] = useState<TodayMealStock | null>(null);
  const [donorInfo, setDonorInfo] = useState<DonorInfo | null>(null);
  const [donorRating, setDonorRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [schoolId, setSchoolId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const session = await getParentSession();
      if (!session) {
        router.replace('/parent-login');
        return;
      }

      setStudent(session.student);
      setTeacherId(session.teacherId);
      setStudentKey(session.studentKey);
      setAllergies(session.student.allergies || '');
      setMealFeedback(session.student.mealFeedbacks || '');
      setSchoolId(session.teacherId);

      if (session.student.classId && session.teacherId) {
        const meal = await getTodayMealInfo(session.teacherId, session.student.studentId);
        setTodayMeal(meal);

        const mealStock = await getTodayMealFromStock(session.teacherId, session.student.classId);
        setTodayMealStock(mealStock);
      }

      if (session.student.classId) {
        const donor = await getTodayDonorInfo(session.student.classId);
        setDonorInfo(donor);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSaveInfo = async () => {
    if (!teacherId || !studentKey) return;

    try {
      await updateAllergiesAndFeedback(teacherId, studentKey, allergies, mealFeedback);

      if (Platform.OS === 'web') {
        alert('Information updated successfully!');
      } else {
        Alert.alert('Success', 'Information updated successfully!');
      }
    } catch (error) {
      console.error('Save error:', error);
      if (Platform.OS === 'web') {
        alert('Failed to save information');
      } else {
        Alert.alert('Error', 'Failed to save information');
      }
    }
  };

  const handleSubmitRating = async (targetDonorName: string, donorId?: string) => {
    if (donorRating === 0) {
      if (Platform.OS === 'web') {
        alert('Please select a rating');
      } else {
        Alert.alert('Error', 'Please select a rating');
      }
      return;
    }

    try {
      let donorIdToRate = donorId || undefined;

      if (!donorIdToRate && student?.classId) {
        const foundDonorId = await getDonorIdByName(student.classId, targetDonorName);
        donorIdToRate = foundDonorId || undefined;
      }

      if (!donorIdToRate) {
        throw new Error('Unable to find donor information');
      }

      await submitDonorRating({
        donorId: donorIdToRate,
        donorName: targetDonorName,
        parentName: student?.parentName || 'Parent',
        studentName: student?.name || 'Student',
        rating: donorRating,
        comment: ratingComment,
      });

      if (Platform.OS === 'web') {
        alert('Thank you for rating the donor!');
      } else {
        Alert.alert('Success', 'Thank you for rating the donor!');
      }

      setDonorRating(0);
      setRatingComment('');

      if (student?.classId && schoolId) {
        const mealStock = await getTodayMealFromStock(schoolId, student.classId);
        setTodayMealStock(mealStock);
      }
    } catch (error) {
      console.error('Rating error:', error);
      if (Platform.OS === 'web') {
        alert('Failed to submit rating');
      } else {
        Alert.alert('Error', 'Failed to submit rating');
      }
    }
  };

  const handleLogout = async () => {
    await logoutParent();
    router.replace('/parent-login');
  };

  if (!student) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/login')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={theme.colors.primary} strokeWidth={2} />
          <Text style={styles.backButtonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={22} color={theme.colors.error} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={[theme.colors.primary, theme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Heart size={48} color={theme.colors.surface} strokeWidth={2} />
        <Text style={styles.headerTitle}>Parent Portal</Text>
        <Text style={styles.headerSubtitle}>Welcome, {student.parentName}</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={24} color={theme.colors.primary} strokeWidth={2} />
            <Text style={styles.cardTitle}>Student Information</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{student.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Student ID:</Text>
            <Text style={styles.infoValue}>{student.studentId}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Grade:</Text>
            <Text style={styles.infoValue}>{student.grade}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age:</Text>
            <Text style={styles.infoValue}>{student.age} years</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Access Code:</Text>
            <Text style={styles.accessCode}>{student.parentAccessToken}</Text>
          </View>
        </View>

        {todayMealStock && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Utensils size={24} color={theme.colors.primary} strokeWidth={2} />
              <Text style={styles.cardTitle}>Today's Meal in Class</Text>
            </View>
            <View style={styles.mealInfoBox}>
              <Text style={styles.mealName}>{todayMealStock.mealName}</Text>
              <Text style={styles.donorNameSmall}>Donated by: {todayMealStock.donorName}</Text>
              <View style={styles.mealMetaRow}>
                <Text style={styles.mealMeta}>Quantity: {todayMealStock.quantity} {todayMealStock.unit}</Text>
                <Text style={styles.mealMeta}>Coverage: {todayMealStock.coverage} students</Text>
              </View>
              {todayMealStock.description && (
                <Text style={styles.mealDescription}>{todayMealStock.description}</Text>
              )}
              <View style={styles.ratingDisplay}>
                <Star size={16} color="#F59E0B" fill="#F59E0B" strokeWidth={2} />
                <Text style={styles.ratingText}>
                  {todayMealStock.averageRating.toFixed(1)} ({todayMealStock.totalRatings} ratings)
                </Text>
              </View>
            </View>

            <View style={styles.ratingSection}>
              <Text style={styles.ratingSectionTitle}>Rate {todayMealStock.donorName}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setDonorRating(star)}
                    activeOpacity={0.7}
                  >
                    <Star
                      size={32}
                      color="#F59E0B"
                      fill={star <= donorRating ? '#F59E0B' : 'transparent'}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.textArea}
                placeholder="Add a comment (optional)"
                placeholderTextColor={theme.colors.text.light}
                value={ratingComment}
                onChangeText={setRatingComment}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => handleSubmitRating(todayMealStock.donorName, todayMealStock.donorId)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>Submit Rating</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {todayMeal && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Utensils size={24} color={theme.colors.primary} strokeWidth={2} />
              <Text style={styles.cardTitle}>Meal Tracking</Text>
            </View>
            <View style={styles.mealStatusBox}>
              <Text style={styles.mealStatus}>
                {todayMeal.mealServed ? 'Meal Served ✓' : 'Not Served Yet'}
              </Text>
              {todayMeal.time && (
                <Text style={styles.mealTime}>Time: {todayMeal.time}</Text>
              )}
            </View>
            {todayMeal.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Notes:</Text>
                <Text style={styles.notesText}>{todayMeal.notes}</Text>
              </View>
            )}
          </View>
        )}


        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AlertCircle size={24} color={theme.colors.primary} strokeWidth={2} />
            <Text style={styles.cardTitle}>Allergy Information</Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="Enter any allergies or dietary restrictions"
            placeholderTextColor={theme.colors.text.light}
            value={allergies}
            onChangeText={setAllergies}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MessageSquare size={24} color={theme.colors.primary} strokeWidth={2} />
            <Text style={styles.cardTitle}>Meal Feedback</Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="Share your feedback about the meals"
            placeholderTextColor={theme.colors.text.light}
            value={mealFeedback}
            onChangeText={setMealFeedback}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveInfo}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>Save Information</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
  },
  logoutButton: {
    padding: theme.spacing.xs,
  },
  header: {
    paddingTop: 60,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
    marginTop: theme.spacing.md,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.surface,
    opacity: 0.9,
    marginTop: theme.spacing.xs,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
  },
  accessCode: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.primary,
    letterSpacing: 4,
  },
  mealInfoBox: {
    backgroundColor: `${theme.colors.primary}05`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  mealName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    marginBottom: 6,
  },
  donorNameSmall: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  mealMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  mealMeta: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
  },
  mealDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  mealStatusBox: {
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  mealStatus: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
  },
  notesBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  notesLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.primary,
  },
  donorInfoBox: {
    backgroundColor: `${theme.colors.primary}05`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  donorName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  donorItem: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  donorQuantity: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  donorDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
  },
  ratingSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  ratingSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  starsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  textArea: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.md,
  },
  submitButton: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  submitButtonGradient: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
  },
  saveButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
    marginTop: theme.spacing.md,
  },
  saveButtonGradient: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
  },
});
