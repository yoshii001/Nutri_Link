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
  KeyboardAvoidingView,
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
  Home,
  Calendar,
  ThumbsUp,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useLanguage } from '@/contexts/LanguageContext';
import { StudentProfile } from '@/types';
import LanguageSelector from '@/components/LanguageSelector';
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
  getScheduledMeals,
  getApprovedMealPlans,
  getSchoolIdFromClass,
  TodayMealInfo,
  DonorInfo,
  TodayMealStock,
  ScheduledMealInfo,
  ApprovedMealPlan
} from '@/services/parent/parentDataService';
import { submitDonorRating } from '@/services/parent/parentRatingService';

export default function ParentPortalScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
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
  const [scheduledMeals, setScheduledMeals] = useState<ScheduledMealInfo[]>([]);
  const [approvedPlans, setApprovedPlans] = useState<ApprovedMealPlan[]>([]);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setDataLoadError(null);

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

      console.log('[Parent Portal] Student data:', {
        studentId: session.student.studentId,
        classId: session.student.classId,
        teacherId: session.teacherId
      });

      let actualSchoolId = session.teacherId;

      if (session.student.classId && session.teacherId) {
        try {
          actualSchoolId = await getSchoolIdFromClass(session.teacherId, session.student.classId);
          console.log('[Parent Portal] Got school ID:', actualSchoolId);
          setSchoolId(actualSchoolId);
        } catch (err) {
          console.error('Error getting school ID:', err);
          actualSchoolId = session.teacherId;
          setSchoolId(session.teacherId);
        }

        try {
          const meal = await getTodayMealInfo(session.teacherId, session.student.studentId);
          console.log('[Parent Portal] Today meal from tracking:', meal);
          setTodayMeal(meal);
        } catch (err) {
          console.error('Error getting today meal:', err);
        }

        try {
          console.log('[Parent Portal] Fetching meal stock with schoolId:', actualSchoolId, 'classId:', session.student.classId);
          const mealStock = await getTodayMealFromStock(actualSchoolId, session.student.classId);
          console.log('[Parent Portal] Meal stock result:', mealStock);
          setTodayMealStock(mealStock);
        } catch (err) {
          console.error('Error getting meal stock:', err);
        }

        try {
          const scheduled = await getScheduledMeals(actualSchoolId, session.student.classId);
          setScheduledMeals(scheduled);
        } catch (err) {
          console.error('Error getting scheduled meals:', err);
          setScheduledMeals([]);
        }

        try {
          const plans = await getApprovedMealPlans(actualSchoolId);
          setApprovedPlans(plans);
        } catch (err) {
          console.error('Error getting approved plans:', err);
          setApprovedPlans([]);
        }
      }

      if (session.student.classId) {
        try {
          const donor = await getTodayDonorInfo(session.student.classId);
          setDonorInfo(donor);
        } catch (err) {
          console.error('Error getting donor info:', err);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setDataLoadError('Failed to load some data. Please try refreshing.');
    } finally {
      setLoading(false);
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
        alert(t('parent.infoUpdated'));
      } else {
        Alert.alert(t('common.success'), t('parent.infoUpdated'));
      }
    } catch (error) {
      console.error('Save error:', error);
      if (Platform.OS === 'web') {
        alert(t('parent.failedToSave'));
      } else {
        Alert.alert(t('common.error'), t('parent.failedToSave'));
      }
    }
  };

  const handleSubmitRating = async (targetDonorName: string, donorId?: string) => {
    if (donorRating === 0) {
      if (Platform.OS === 'web') {
        alert(t('parent.selectRating'));
      } else {
        Alert.alert(t('common.error'), t('parent.selectRating'));
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
        alert(t('parent.thankYouRating'));
      } else {
        Alert.alert(t('common.success'), t('parent.thankYouRating'));
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
        alert(t('parent.failedToRate'));
      } else {
        Alert.alert(t('common.error'), t('parent.failedToRate'));
      }
    }
  };

  const handleLogout = async () => {
    await logoutParent();
    router.replace('/parent-login');
  };

  if (loading || !student) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Heart size={40} color="#FFFFFF" strokeWidth={2.5} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{t('parent.hello')}, {student.parentName}!</Text>
            <Text style={styles.headerSubtitle}>{student.name}{t('parent.mealInfo')}</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LogOut size={24} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.languageSelectorContainer}>
        <LanguageSelector />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIconContainer}>
            <User size={32} color="#10B981" strokeWidth={2.5} />
          </View>
          <Text style={styles.welcomeTitle}>{student.name}</Text>
          <Text style={styles.welcomeSubtitle}>{t('parent.grade')} {student.grade} • {t('parent.age')} {student.age}</Text>
          <View style={styles.accessCodeBox}>
            <Text style={styles.accessCodeLabel}>{t('parent.yourAccessCode')}</Text>
            <Text style={styles.accessCode}>{student.parentAccessToken}</Text>
          </View>
        </View>

        {todayMealStock ? (
          <View style={styles.bigCard}>
            <View style={styles.bigCardHeader}>
              <Utensils size={28} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.bigCardTitle}>{t('parent.todayMeal')}</Text>
            </View>
            <View style={styles.mealContent}>
              <Text style={styles.bigMealName}>{todayMealStock.mealName}</Text>
              {todayMealStock.description && (
                <Text style={styles.mealDescription}>{todayMealStock.description}</Text>
              )}
              <View style={styles.mealInfoRow}>
                <View style={styles.mealInfoItem}>
                  <Text style={styles.mealInfoLabel}>{t('parent.amount')}</Text>
                  <Text style={styles.mealInfoValue}>{todayMealStock.quantity} {todayMealStock.unit}</Text>
                </View>
                <View style={styles.mealInfoItem}>
                  <Text style={styles.mealInfoLabel}>{t('parent.for')}</Text>
                  <Text style={styles.mealInfoValue}>{todayMealStock.coverage} {t('parent.students')}</Text>
                </View>
              </View>

              <View style={styles.donorBox}>
                <Text style={styles.donorLabel}>{t('parent.donatedBy')}</Text>
                <Text style={styles.donorName}>{todayMealStock.donorName}</Text>
                {todayMealStock.totalRatings > 0 && (
                  <View style={styles.ratingDisplay}>
                    <Star size={18} color="#F59E0B" fill="#F59E0B" strokeWidth={2} />
                    <Text style={styles.ratingText}>
                      {todayMealStock.averageRating.toFixed(1)} ({todayMealStock.totalRatings} {t('parent.ratings')})
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.ratingSection}>
                <Text style={styles.ratingSectionTitle}>{t('parent.howWasMeal')}</Text>
                <Text style={styles.ratingSectionSubtitle}>{t('parent.tapStars')}</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setDonorRating(star)}
                      activeOpacity={0.7}
                      style={styles.starButton}
                    >
                      <Star
                        size={42}
                        color="#F59E0B"
                        fill={star <= donorRating ? '#F59E0B' : 'transparent'}
                        strokeWidth={2.5}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                {donorRating > 0 && (
                  <Text style={styles.ratingLabel}>
                    {donorRating === 1 ? t('parent.poor') : donorRating === 2 ? t('parent.fair') : donorRating === 3 ? t('parent.good') : donorRating === 4 ? t('parent.veryGood') : t('parent.excellent')}
                  </Text>
                )}
                <TextInput
                  style={styles.commentInput}
                  placeholder={t('parent.addComment')}
                  placeholderTextColor="#9CA3AF"
                  value={ratingComment}
                  onChangeText={setRatingComment}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity
                  style={styles.bigButton}
                  onPress={() => handleSubmitRating(todayMealStock.donorName, todayMealStock.donorId)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.bigButtonGradient}
                  >
                    <ThumbsUp size={22} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.bigButtonText}>{t('parent.submitRating')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Utensils size={48} color="#D1D5DB" strokeWidth={2} />
            <Text style={styles.emptyTitle}>{t('parent.noMealToday')}</Text>
            <Text style={styles.emptyText}>{t('parent.noMealScheduled')}</Text>
          </View>
        )}

        {todayMeal && (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Home size={24} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.statusTitle}>{t('parent.mealStatus')}</Text>
            </View>
            <View style={todayMeal.mealServed ? styles.statusServed : styles.statusPending}>
              <Text style={styles.statusText}>
                {todayMeal.mealServed ? t('parent.mealServed') : t('parent.notServedYet')}
              </Text>
              {todayMeal.time && (
                <Text style={styles.statusTime}>{t('parent.at')} {todayMeal.time}</Text>
              )}
            </View>
            {todayMeal.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>{t('parent.teacherNote')}</Text>
                <Text style={styles.notesText}>{todayMeal.notes}</Text>
              </View>
            )}
          </View>
        )}

        {scheduledMeals.length > 0 && (
          <View style={styles.scheduledSection}>
            <View style={styles.scheduledHeader}>
              <Calendar size={28} color="#6366F1" strokeWidth={2.5} />
              <View style={styles.scheduledHeaderText}>
                <Text style={styles.scheduledTitle}>{t('parent.scheduledMeals')}</Text>
                <Text style={styles.scheduledSubtitle}>{t('parent.assignedToClass')}</Text>
              </View>
            </View>

            {scheduledMeals.map((meal, index) => {
              const mealDate = new Date(meal.date);
              const isToday = meal.date === new Date().toISOString().split('T')[0];
              const dayOfWeek = mealDate.toLocaleDateString('en-US', { weekday: 'short' });
              const monthDay = mealDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <View key={index} style={[styles.scheduledMealCard, isToday && styles.scheduledMealCardToday]}>
                  <View style={styles.scheduledMealHeader}>
                    <View style={[styles.scheduledDateBadge, isToday && styles.scheduledDateBadgeToday]}>
                      <Text style={[styles.scheduledDayOfWeek, isToday && styles.scheduledDayOfWeekToday]}>{dayOfWeek}</Text>
                      <Text style={[styles.scheduledMonthDay, isToday && styles.scheduledMonthDayToday]}>{monthDay}</Text>
                    </View>
                    <View style={styles.scheduledMealDetails}>
                      <Text style={styles.scheduledMealName}>{meal.mealName}</Text>
                      {meal.description && (
                        <Text style={styles.scheduledMealDescription} numberOfLines={2}>{meal.description}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.scheduledMealFooter}>
                    <View style={styles.scheduledMealInfoRow}>
                      <View style={styles.scheduledMealInfoBadge}>
                        <Text style={styles.scheduledMealInfoLabel}>{t('parent.amount')}</Text>
                        <Text style={styles.scheduledMealInfoValue}>{meal.quantity} {meal.unit}</Text>
                      </View>
                      <View style={styles.scheduledMealInfoBadge}>
                        <Text style={styles.scheduledMealInfoLabel}>{t('parent.serves')}</Text>
                        <Text style={styles.scheduledMealInfoValue}>{meal.coverage} {t('parent.kids')}</Text>
                      </View>
                    </View>
                    <View style={styles.scheduledDonorInfo}>
                      <Text style={styles.scheduledDonorLabel}>{t('parent.providedBy')}</Text>
                      <Text style={styles.scheduledDonorName}>{meal.donorName}</Text>
                    </View>
                  </View>
                  {isToday && (
                    <View style={styles.todayIndicator}>
                      <Text style={styles.todayIndicatorText}>{t('parent.today')}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {scheduledMeals.length === 0 && approvedPlans.length > 0 && (
          <View style={styles.upcomingCard}>
            <View style={styles.upcomingHeader}>
              <Calendar size={24} color="#6366F1" strokeWidth={2.5} />
              <Text style={styles.upcomingTitle}>{t('parent.upcomingMealPlans')}</Text>
            </View>

            {approvedPlans.slice(0, 3).map((plan, index) => (
              <View key={index} style={styles.upcomingMealItem}>
                <View style={styles.upcomingDate}>
                  <Text style={styles.upcomingDateText}>
                    {new Date(plan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.upcomingMealInfo}>
                  <Text style={styles.upcomingMealName}>{plan.menu[0]?.mealName || t('parent.mealPlan')}</Text>
                  <Text style={styles.upcomingMealDonor}>{plan.menu.length} {t('parent.itemsPlanned')}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <AlertCircle size={24} color="#EF4444" strokeWidth={2.5} />
            <Text style={styles.inputTitle}>{t('parent.allergyInfo')}</Text>
          </View>
          <TextInput
            style={styles.bigInput}
            placeholder={t('parent.allergyPlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={allergies}
            onChangeText={setAllergies}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <MessageSquare size={24} color="#3B82F6" strokeWidth={2.5} />
            <Text style={styles.inputTitle}>{t('parent.yourFeedback')}</Text>
          </View>
          <TextInput
            style={styles.bigInput}
            placeholder={t('parent.feedbackPlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={mealFeedback}
            onChangeText={setMealFeedback}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={styles.bigButton}
          onPress={handleSaveInfo}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bigButtonGradient}
          >
            <Text style={styles.bigButtonText}>{t('parent.saveInformation')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  languageSelectorContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
  },
  accessCodeBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  accessCodeLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  accessCode: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
    letterSpacing: 6,
  },
  bigCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bigCardHeader: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bigCardTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  mealContent: {
    padding: 20,
  },
  bigMealName: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  mealDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 22,
  },
  mealInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  mealInfoItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  mealInfoLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  mealInfoValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  donorBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  donorLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6366F1',
    marginBottom: 4,
  },
  donorName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#4338CA',
    marginBottom: 8,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  statusServed: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  statusTime: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  notesBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
  },
  notesLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  ratingSection: {
    borderTopWidth: 2,
    borderTopColor: '#F3F4F6',
    paddingTop: 20,
  },
  ratingSectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  ratingSectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 16,
  },
  commentInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  bigButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bigButtonGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bigButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  upcomingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  upcomingTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  upcomingMealItem: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    gap: 12,
  },
  upcomingDate: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  upcomingDateText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  upcomingMealInfo: {
    flex: 1,
  },
  upcomingMealName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 2,
  },
  upcomingMealDonor: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  inputTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  bigInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  scheduledSection: {
    marginBottom: 16,
  },
  scheduledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  scheduledHeaderText: {
    flex: 1,
  },
  scheduledTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  scheduledSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  scheduledMealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  scheduledMealCardToday: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  scheduledMealHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  scheduledDateBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  scheduledDateBadgeToday: {
    backgroundColor: '#10B981',
  },
  scheduledDayOfWeek: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scheduledDayOfWeekToday: {
    color: '#FFFFFF',
  },
  scheduledMonthDay: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#4338CA',
    marginTop: 2,
  },
  scheduledMonthDayToday: {
    color: '#FFFFFF',
  },
  scheduledMealDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  scheduledMealName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  scheduledMealDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  scheduledMealFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  scheduledMealInfoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  scheduledMealInfoBadge: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  scheduledMealInfoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  scheduledMealInfoValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  scheduledDonorInfo: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  scheduledDonorLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#3B82F6',
    marginBottom: 2,
  },
  scheduledDonorName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1E40AF',
  },
  todayIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  todayIndicatorText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
