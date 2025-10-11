import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/constants/theme';
import { Users, UtensilsCrossed, ClipboardCheck, BarChart, Package } from 'lucide-react-native';
import TeacherHeader from '@/components/TeacherHeader';
import TeacherBottomNav from '@/components/TeacherBottomNav';
import { getTeacherByUserId } from '@/services/firebase/teacherService';
import { getClassesBySchoolId } from '@/services/firebase/classService';
import { getMealStockByClass, MealStock } from '@/services/firebase/mealStockService';

export default function TeacherDashboard() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [mealStockCount, setMealStockCount] = useState(0);
  const [totalCoverage, setTotalCoverage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMealStock();
  }, [user]);

  const loadMealStock = async () => {
    if (!user) return;

    try {
      const teacherData = await getTeacherByUserId(user.uid);
      if (!teacherData) {
        setLoading(false);
        return;
      }

      const allClasses = await getClassesBySchoolId(teacherData.teacher.schoolId);
      let assignedClassId = '';

      for (const [id, classInfo] of Object.entries(allClasses)) {
        if (classInfo.teacherId === teacherData.id) {
          assignedClassId = id;
          break;
        }
      }

      if (assignedClassId) {
        const mealStock = await getMealStockByClass(teacherData.teacher.schoolId, assignedClassId);
        const stockEntries = Object.values(mealStock);
        setMealStockCount(stockEntries.length);
        const coverage = stockEntries.reduce((sum, meal) => sum + (meal.coverage || 0), 0);
        setTotalCoverage(coverage);
      }
    } catch (error) {
      console.error('Error loading meal stock:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TeacherHeader title="Teacher Dashboard" subtitle={`Welcome, ${userData?.name || 'Teacher'}`} />

      <ScrollView style={styles.content}>
        {/* Stock Summary Card */}
        {!loading && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Meal Stock Overview</Text>
            <View style={styles.summaryStats}>
              <View style={styles.statBox}>
                <Package size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>{mealStockCount}</Text>
                <Text style={styles.statLabel}>Total Meals</Text>
              </View>
              <View style={styles.statBox}>
                <Users size={24} color={theme.colors.success} />
                <Text style={styles.statValue}>{totalCoverage}</Text>
                <Text style={styles.statLabel}>Can Serve</Text>
              </View>
            </View>
            <View style={styles.stockInfo}>
              <Text style={styles.stockInfoText}>
                Includes meals from approved meal plans and claimed donations
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.viewStockButton}
              onPress={() => router.push('/teacher/meal-stock' as any)}
            >
              <Text style={styles.viewStockButtonText}>View Full Stock</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.card} onPress={() => router.push('/teacher/claim-meal' as any)}>
            <Package size={32} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Claim Meals</Text>
            <Text style={styles.cardDesc}>View and claim available donations for your class</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => router.push('/teacher/students' as any)}>
            <Users size={32} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Manage Students</Text>
            <Text style={styles.cardDesc}>Add or view student profiles and share links</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => router.push('/teacher/serve-meals' as any)}>
            <UtensilsCrossed size={32} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Serve Meals</Text>
            <Text style={styles.cardDesc}>Mark meals served to students</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => router.push('/teacher/attendance' as any)}>
            <ClipboardCheck size={32} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Mark Attendance & Feedback</Text>
            <Text style={styles.cardDesc}>Track daily attendance and give feedback</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => router.push('/teacher/reports' as any)}>
            <BarChart size={32} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Monthly Reports</Text>
            <Text style={styles.cardDesc}>View performance and attendance summaries</Text>
          </TouchableOpacity>
        </View>
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
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.md,
  },
  statBox: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontFamily: 'Inter-Medium',
  },
  viewStockButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  viewStockButtonText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  stockInfo: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  stockInfoText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  actions: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
    marginTop: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 4,
    lineHeight: 20,
  },
});
