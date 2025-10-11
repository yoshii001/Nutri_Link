import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Package, Users, Calendar, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getTeacherByUserId } from '@/services/firebase/teacherService';
import { getClassesBySchoolId } from '@/services/firebase/classService';
import {
  listenToClassMealStock,
  MealStock,
  deleteMealFromStock,
} from '@/services/firebase/mealStockService';
import { theme } from '@/constants/theme';
import TeacherHeader from '@/components/TeacherHeader';
import TeacherBottomNav from '@/components/TeacherBottomNav';

export default function MealStockScreen() {
  const { user, userData } = useAuth();
  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');
  const [className, setClassName] = useState('');
  const [mealStock, setMealStock] = useState<Record<string, MealStock>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const teacherData = await getTeacherByUserId(user.uid);
        if (!teacherData) {
          Alert.alert('Error', 'Teacher profile not found');
          setLoading(false);
          return;
        }

        setSchoolId(teacherData.teacher.schoolId);

        const allClasses = await getClassesBySchoolId(teacherData.teacher.schoolId);
        let assignedClassId = '';

        for (const [id, classInfo] of Object.entries(allClasses)) {
          if (classInfo.teacherId === teacherData.id) {
            assignedClassId = id;
            setClassName(classInfo.className);
            break;
          }
        }

        setClassId(assignedClassId);

        if (assignedClassId) {
          const unsubscribe = listenToClassMealStock(
            teacherData.teacher.schoolId,
            assignedClassId,
            (meals) => {
              setMealStock(meals);
              setLoading(false);
            }
          );

          return () => {
            unsubscribe();
          };
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    })();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleDeleteMeal = async (mealId: string, mealName: string) => {
    Alert.alert('Delete Meal', `Delete ${mealName} from stock?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMealFromStock(schoolId, classId, mealId);
            Alert.alert('Success', 'Meal removed from stock');
          } catch (error) {
            console.error('Error deleting meal:', error);
            Alert.alert('Error', 'Failed to delete meal');
          }
        },
      },
    ]);
  };

  const sortedMeals = Object.entries(mealStock).sort(
    ([, a], [, b]) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime()
  );

  const totalCoverage = Object.values(mealStock).reduce(
    (sum, meal) => sum + (meal.coverage || 0),
    0
  );

  return (
    <View style={styles.container}>
      <TeacherHeader title="Meal Stock" subtitle={`Available for ${className}`} />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!classId && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>No Class Assigned</Text>
            <Text style={styles.warningText}>
              You need to be assigned to a class to manage meal stock.
            </Text>
          </View>
        )}

        {classId && (
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.summaryGradient}
            >
              <View style={styles.summaryItem}>
                <Package size={28} color={theme.colors.surface} strokeWidth={2.5} />
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Total Meals</Text>
                  <Text style={styles.summaryValue}>{sortedMeals.length}</Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Users size={28} color={theme.colors.surface} strokeWidth={2.5} />
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Can Serve</Text>
                  <Text style={styles.summaryValue}>{totalCoverage}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading meal stock...</Text>
          </View>
        ) : sortedMeals.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={64} color={theme.colors.text.light} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No meals in stock</Text>
            <Text style={styles.emptySubtext}>
              Claim meals to add them to your class stock
            </Text>
          </View>
        ) : (
          sortedMeals.map(([id, meal]) => (
            <View key={id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.mealName}>{meal.mealName}</Text>
                <TouchableOpacity
                  onPress={() => handleDeleteMeal(id, meal.mealName)}
                  style={styles.deleteButton}
                >
                  <Trash2 size={20} color="#DC2626" strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {meal.description && (
                <Text style={styles.description}>{meal.description}</Text>
              )}

              <View style={styles.coverageBox}>
                <Users size={20} color={theme.colors.primary} strokeWidth={2.5} />
                <View style={styles.coverageContent}>
                  <Text style={styles.coverageLabel}>Students Coverage</Text>
                  <Text style={styles.coverageValue}>
                    Can serve {meal.coverage} students
                  </Text>
                  <Text style={styles.coverageDetails}>
                    {meal.quantity} {meal.unit} available
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Donor</Text>
                  <Text style={styles.detailValue}>{meal.donorName}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Claimed By</Text>
                  <Text style={styles.detailValue}>{meal.claimedBy}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Calendar size={14} color={theme.colors.text.secondary} />
                  <Text style={styles.dateText}>
                    {new Date(meal.claimedAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TeacherBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  warningTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
  },
  summaryCard: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  summaryGradient: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.surface,
    opacity: 0.9,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
  },
  summaryDivider: {
    width: 2,
    height: 40,
    backgroundColor: theme.colors.surface,
    opacity: 0.3,
    marginHorizontal: theme.spacing.md,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.light,
    marginTop: theme.spacing.xs,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  mealName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    flex: 1,
  },
  deleteButton: {
    padding: theme.spacing.sm,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  coverageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  coverageContent: {
    flex: 1,
  },
  coverageLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  coverageValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  coverageDetails: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
  },
  dateText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
  },
});
