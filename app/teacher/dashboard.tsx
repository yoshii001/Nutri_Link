import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/constants/theme';
import { Users, UtensilsCrossed, ClipboardCheck, BarChart, Package, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react-native';
import TeacherHeader from '@/components/TeacherHeader';
import TeacherBottomNav from '@/components/TeacherBottomNav';
import { getTeacherByUserId } from '@/services/firebase/teacherService';
import { getClassesBySchoolId } from '@/services/firebase/classService';
import { getMealStockByClass, MealStock } from '@/services/firebase/mealStockService';

// Modern grid-inspired color palette
const COLORS = {
  ocean: '#0891B2',      // Cyan-600
  mint: '#10B981',       // Emerald-500
  coral: '#F43F5E',      // Rose-500
  violet: '#8B5CF6',     // Violet-500
  amber: '#F59E0B',      // Amber-500
  sky: '#0EA5E9',        // Sky-500
  slate: '#64748B',      // Slate-500
  neutral: '#F8FAFC',    // Slate-50
};

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

  const getStockStatus = () => {
    if (totalCoverage === 0) return { text: 'No Stock', color: COLORS.coral };
    if (totalCoverage < 20) return { text: 'Low Stock', color: COLORS.amber };
    return { text: 'Good Stock', color: COLORS.mint };
  };

  const stockStatus = getStockStatus();

  return (
    <View style={styles.container}>
      <TeacherHeader title="Teacher Dashboard" subtitle={`Welcome back, ${userData?.name || 'Teacher'}`} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Premium Stock Summary Card */}
        {!loading && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryTitle}>Meal Inventory</Text>
                <Text style={styles.summarySubtitle}>Live stock overview</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: stockStatus.color + '15' }]}>
                <View style={[styles.statusDot, { backgroundColor: stockStatus.color }]} />
                <Text style={[styles.statusText, { color: stockStatus.color }]}>
                  {stockStatus.text}
                </Text>
              </View>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={[styles.mainStatCard, { backgroundColor: COLORS.ocean + '12' }]}>
                <View style={[styles.statIconLarge, { backgroundColor: COLORS.ocean }]}>
                  <Package size={24} color="#FFF" strokeWidth={2.5} />
                </View>
                <View style={styles.statContent}>
                  <Text style={[styles.statValueLarge, { color: COLORS.ocean }]}>
                    {mealStockCount}
                  </Text>
                  <Text style={styles.statLabelLarge}>Meal Types</Text>
                </View>
                <View style={[styles.trendIndicator, { backgroundColor: COLORS.mint + '20' }]}>
                  <TrendingUp size={18} color={COLORS.mint} strokeWidth={2.5} />
                </View>
              </View>
              
              <View style={styles.secondaryStatsRow}>
                <View style={[styles.secondaryStatCard, { backgroundColor: COLORS.mint + '12' }]}>
                  <View style={[styles.secondaryStatIcon, { backgroundColor: COLORS.mint }]}>
                    <Users size={18} color="#FFF" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.secondaryStatValue, { color: COLORS.mint }]}>
                    {totalCoverage}
                  </Text>
                  <Text style={styles.secondaryStatLabel}>Students Served</Text>
                </View>
                
                <View style={[styles.secondaryStatCard, { backgroundColor: COLORS.amber + '12' }]}>
                  <View style={[styles.secondaryStatIcon, { backgroundColor: COLORS.amber }]}>
                    <AlertCircle size={18} color="#FFF" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.secondaryStatValue, { color: COLORS.amber }]}>
                    {mealStockCount > 0 ? Math.round(totalCoverage / mealStockCount) : 0}
                  </Text>
                  <Text style={styles.secondaryStatLabel}>Avg per Meal</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.infoBox}>
              <View style={styles.infoIcon}>
                <Text style={styles.infoEmoji}>ℹ️</Text>
              </View>
              <Text style={styles.infoText}>
                Includes approved meal plans and claimed donations
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: COLORS.ocean }]}
              onPress={() => router.push('/teacher/meal-stock' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>View Full Inventory</Text>
              <ArrowRight size={18} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions Grid */}
        <View style={styles.actionsHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionSubtitle}>Manage your classroom</Text>
        </View>
        
        <View style={styles.actionsGrid}>
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: COLORS.sky + '12' }]} 
              onPress={() => router.push('/teacher/claim-meal' as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconWrapper, { backgroundColor: COLORS.sky }]}>
                <Package size={22} color="#FFF" strokeWidth={2.5} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Claim Meals</Text>
                <Text style={styles.actionDesc}>Browse donations</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: COLORS.mint + '12' }]} 
              onPress={() => router.push('/teacher/students' as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconWrapper, { backgroundColor: COLORS.mint }]}>
                <Users size={22} color="#FFF" strokeWidth={2.5} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Students</Text>
                <Text style={styles.actionDesc}>Manage profiles</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: COLORS.coral + '12' }]} 
              onPress={() => router.push('/teacher/serve-meals' as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconWrapper, { backgroundColor: COLORS.coral }]}>
                <UtensilsCrossed size={22} color="#FFF" strokeWidth={2.5} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Serve Meals</Text>
                <Text style={styles.actionDesc}>Track distribution</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: COLORS.violet + '12' }]} 
              onPress={() => router.push('/teacher/reports' as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconWrapper, { backgroundColor: COLORS.violet }]}>
                <BarChart size={22} color="#FFF" strokeWidth={2.5} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Reports</Text>
                <Text style={styles.actionDesc}>View analytics</Text>
              </View>
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
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  summarySubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  mainStatCard: {
    padding: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.ocean + '20',
  },
  statIconLarge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statContent: {
    flex: 1,
  },
  statValueLarge: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    letterSpacing: -1,
    lineHeight: 36,
  },
  statLabelLarge: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter-SemiBold',
    marginTop: 2,
  },
  trendIndicator: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  secondaryStatValue: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  secondaryStatLabel: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoEmoji: {
    fontSize: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
    lineHeight: 16,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.ocean,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.2,
  },
  actionsHeader: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  actionsGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionContent: {
    flex: 1,
    marginLeft: 14,
  },
  actionTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  actionDesc: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
  },
  actionArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bottomSpacing: {
    height: 24,
  },
});