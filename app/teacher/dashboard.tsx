import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
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

  // Redirect to login if user is not authenticated
  if (!user || !userData) {
    console.log('[TeacherDashboard] User not authenticated, redirecting to login');
    return <Redirect href="/login" />;
  }

  // Redirect to main dashboard if user is not a teacher
  if (userData.role !== 'teacher') {
    console.log('[TeacherDashboard] User is not a teacher, redirecting to dashboard');
    return <Redirect href="/(tabs)/dashboard" />;
  }

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Enhanced Stock Summary Card */}
        {!loading && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Meal Stock Overview</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Live</Text>
              </View>
            </View>
            
            <View style={styles.summaryStats}>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Package size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.statValue}>{mealStockCount}</Text>
                <Text style={styles.statLabel}>Total Meals</Text>
                <View style={styles.statDivider} />
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: theme.colors.success + '15' }]}>
                  <Users size={24} color={theme.colors.success} />
                </View>
                <Text style={[styles.statValue, { color: theme.colors.success }]}>{totalCoverage}</Text>
                <Text style={styles.statLabel}>Can Serve</Text>
                <View style={[styles.statDivider, { backgroundColor: theme.colors.success }]} />
              </View>
            </View>
            
            <View style={styles.stockInfo}>
              <Text style={styles.stockInfoText}>
                📦 Includes approved meal plans and claimed donations
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.viewStockButton}
              onPress={() => router.push('/teacher/meal-stock' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.viewStockButtonText}>View Full Stock</Text>
              <Text style={styles.viewStockArrow}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions Section */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actions}>
          <View style={styles.cardRow}>
            <TouchableOpacity 
              style={[styles.card, styles.cardSmall]} 
              onPress={() => router.push('/teacher/claim-meal' as any)}
              activeOpacity={0.9}
            >
              <View style={styles.cardIconSmall}>
                <Package size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Claim Meals</Text>
              <Text style={styles.cardDesc}>View and claim donations</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.card, styles.cardSmall]} 
              onPress={() => router.push('/teacher/students' as any)}
              activeOpacity={0.9}
            >
              <View style={styles.cardIconSmall}>
                <Users size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Manage Students</Text>
              <Text style={styles.cardDesc}>Add or view profiles</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardRow}>
            <TouchableOpacity 
              style={[styles.card, styles.cardSmall]} 
              onPress={() => router.push('/teacher/serve-meals' as any)}
              activeOpacity={0.9}
            >
              <View style={styles.cardIconSmall}>
                <UtensilsCrossed size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Serve Meals</Text>
              <Text style={styles.cardDesc}>Mark meals served</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.card, styles.cardSmall]} 
              onPress={() => router.push('/teacher/reports' as any)}
              activeOpacity={0.9}
            >
              <View style={styles.cardIconSmall}>
                <BarChart size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Monthly Reports</Text>
              <Text style={styles.cardDesc}>View attendance</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.bottomSpacing} />
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
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  summaryTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
  },
  badge: {
    backgroundColor: theme.colors.success + '15',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statIconContainer: {
    backgroundColor: theme.colors.primary + '15',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontFamily: 'Inter-Medium',
  },
  statDivider: {
    width: 30,
    height: 3,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    marginTop: theme.spacing.xs,
  },
  stockInfo: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  stockInfoText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  viewStockButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  viewStockButtonText: {
    color: theme.colors.surface,
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  viewStockArrow: {
    color: theme.colors.surface,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  actions: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  cardSmall: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  cardIconSmall: {
    backgroundColor: theme.colors.primary + '15',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  cardDesc: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },
  bottomSpacing: {
    height: 20,
  },
});