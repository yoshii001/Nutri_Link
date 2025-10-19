import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getSchoolByPrincipalId } from '@/services/firebase/schoolService';
import { getTeachersBySchoolId } from '@/services/firebase/teacherService';
import { getMealPlansBySchoolId } from '@/services/firebase/mealPlanService';
import { getDonationsBySchoolId } from '@/services/firebase/donationService';
import { getDonationRequestsBySchoolId } from '@/services/firebase/donationRequestService';
import {
  School,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Plus,
  ChevronRight,
} from 'lucide-react-native';
import PrincipalHeader from '@/components/PrincipalHeader';
import PrincipalBottomNav from '@/components/PrincipalBottomNav';
import MiniDonationChart from '@/components/MiniDonationChart';
import AlertsPanel, { Alert } from '@/components/AlertsPanel';
import type { DonationRequest, Donation } from '@/types';

export default function PrincipalDashboardScreen() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>('');
  const [stats, setStats] = useState({
    teachers: 0,
    mealPlans: 0,
    donations: 0,
    activeRequests: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [hasSchool, setHasSchool] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [chartData, setChartData] = useState<{ date: string; amount: number }[]>([]);

  // Redirect to login if user is not authenticated
  if (!user || !userData) {
    console.log('[PrincipalDashboard] User not authenticated, redirecting to login');
    return <Redirect href="/login" />;
  }

  // Redirect to dashboard if user is not principal
  if (userData.role !== 'principal') {
    console.log('[PrincipalDashboard] User is not a principal, redirecting to dashboard');
    return <Redirect href="/(tabs)/dashboard" />;
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;

    try {
      const schoolData = await getSchoolByPrincipalId(user.uid);

      if (!schoolData) {
        setHasSchool(false);
        return;
      }

      setHasSchool(true);
      setSchoolId(schoolData.id);
      setSchoolName(schoolData.school.name);

      const [teachers, mealPlans, donations, requests] = await Promise.all([
        getTeachersBySchoolId(schoolData.id),
        getMealPlansBySchoolId(schoolData.id),
        getDonationsBySchoolId(schoolData.id),
        getDonationRequestsBySchoolId(schoolData.id),
      ]);

      const activeRequests = Object.values(requests).filter((r) => r.status === 'active').length;
      const totalDonations = Object.values(donations).reduce((sum, d) => sum + d.amount, 0);

      setStats({
        teachers: Object.keys(teachers).length,
        mealPlans: Object.keys(mealPlans).length,
        donations: totalDonations,
        activeRequests,
      });

      // Generate alerts
      generateAlerts(requests, donations, teachers);

      // Generate chart data (last 7 days)
      generateChartData(donations);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const generateAlerts = (
    requests: Record<string, DonationRequest>,
    donations: Record<string, Donation>,
    teachers: Record<string, any>
  ) => {
    const newAlerts: Alert[] = [];

    // Check for pending donation requests
    const pendingRequests = Object.entries(requests).filter(
      ([_, r]) => r.status === 'active'
    );
    
    if (pendingRequests.length > 0) {
      newAlerts.push({
        id: 'pending-requests',
        type: 'pending_request',
        title: `${pendingRequests.length} Active Donation Request${pendingRequests.length > 1 ? 's' : ''}`,
        message: 'You have donation requests awaiting donor responses.',
        action: () => router.push('/principal/request-donation'),
        actionLabel: 'View Requests',
      });
    }

    // Check for recent donations (last 24 hours)
    const recentDonations = Object.values(donations).filter((d) => {
      const donationDate = new Date(d.date);
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      return donationDate > oneDayAgo && d.status === 'completed';
    });

    if (recentDonations.length > 0) {
      const totalRecent = recentDonations.reduce((sum, d) => sum + d.amount, 0);
      newAlerts.push({
        id: 'recent-donations',
        type: 'success',
        title: `${recentDonations.length} New Donation${recentDonations.length > 1 ? 's' : ''}!`,
        message: `Received $${totalRecent.toFixed(2)} in the last 24 hours.`,
        action: () => router.push('/principal/donor-list'),
        actionLabel: 'View Donors',
      });
    }

    // Check if no teachers assigned
    if (Object.keys(teachers).length === 0) {
      newAlerts.push({
        id: 'no-teachers',
        type: 'urgent',
        title: 'No Teachers Added',
        message: 'Add teachers to your school to start managing classes and meals.',
        action: () => router.push('/principal/manage-teachers'),
        actionLabel: 'Add Teachers',
      });
    }

    // Check for unfulfilled requests
    const unfulfilledRequests = Object.entries(requests).filter(
      ([_, r]) => r.status === 'active' && r.fulfilledAmount < r.requestedAmount
    );

    if (unfulfilledRequests.length > 0) {
      const totalNeeded = unfulfilledRequests.reduce(
        (sum, [_, r]) => sum + (r.requestedAmount - r.fulfilledAmount),
        0
      );
      newAlerts.push({
        id: 'unfulfilled-requests',
        type: 'low_inventory',
        title: 'Unfulfilled Donation Needs',
        message: `Still need $${totalNeeded.toFixed(2)} to meet active donation goals.`,
        action: () => router.push('/principal/request-donation'),
        actionLabel: 'View Details',
      });
    }

    setAlerts(newAlerts);
  };

  const generateChartData = (donations: Record<string, Donation>) => {
    // Get last 7 days
    const last7Days: { date: string; amount: number }[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const dayTotal = Object.values(donations)
        .filter((d) => d.date.startsWith(dateString) && d.status === 'completed')
        .reduce((sum, d) => sum + d.amount, 0);
      
      last7Days.push({
        date: dateString,
        amount: dayTotal,
      });
    }

    setChartData(last7Days);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (!hasSchool) {
    return (
      <View style={styles.container}>
        <PrincipalHeader title="Principal Dashboard" />

        <View style={styles.noSchoolContainer}>
          <School color="#007AFF" size={64} />
          <Text style={styles.noSchoolTitle}>No School Registered</Text>
          <Text style={styles.noSchoolText}>
            You need to request school addition before you can access principal features.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/principal/request-school')}
          >
            <Text style={styles.primaryButtonText}>Request School Addition</Text>
          </TouchableOpacity>
        </View>
        <PrincipalBottomNav />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PrincipalHeader title="Principal Dashboard" subtitle={schoolName} />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
            <Users color="#1976D2" size={32} />
            <Text style={styles.statValue}>{stats.teachers}</Text>
            <Text style={styles.statLabel}>Teachers</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
            <Calendar color="#7B1FA2" size={32} />
            <Text style={styles.statValue}>{stats.mealPlans}</Text>
            <Text style={styles.statLabel}>Meal Plans</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
            <DollarSign color="#388E3C" size={32} />
            <Text style={styles.statValue}>${stats.donations}</Text>
            <Text style={styles.statLabel}>Donations</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
            <FileText color="#F57C00" size={32} />
            <Text style={styles.statValue}>{stats.activeRequests}</Text>
            <Text style={styles.statLabel}>Active Requests</Text>
          </View>
        </View>

        {/* Alerts Panel */}
        <AlertsPanel alerts={alerts} />

        {/* Donation Trend Chart */}
        <MiniDonationChart data={chartData} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/principal/manage-classes')}
          >
            <View style={styles.actionIcon}>
              <School color="#007AFF" size={24} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Manage Classes</Text>
              <Text style={styles.actionDescription}>Create classes and assign teachers</Text>
            </View>
            <ChevronRight color="#999" size={24} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/principal/manage-teachers')}
          >
            <View style={styles.actionIcon}>
              <Users color="#007AFF" size={24} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Manage Teachers</Text>
              <Text style={styles.actionDescription}>Add and manage school teachers</Text>
            </View>
            <ChevronRight color="#999" size={24} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/principal/meal-plans')}
          >
            <View style={styles.actionIcon}>
              <Calendar color="#34C759" size={24} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Meal Plans</Text>
              <Text style={styles.actionDescription}>Create and approve meal plans</Text>
            </View>
            <ChevronRight color="#999" size={24} />
          </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/principal/donor-list')}>
            <View style={styles.actionIcon}>
              <DollarSign color="#FF9500" size={24} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>View Donors</Text>
              <Text style={styles.actionDescription}>Track donation impact</Text>
            </View>
            <ChevronRight color="#999" size={24} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/principal/request-donation')}
          >
            <View style={styles.actionIcon}>
              <Plus color="#FF3B30" size={24} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Request Donations</Text>
              <Text style={styles.actionDescription}>Create donation requests</Text>
            </View>
            <ChevronRight color="#999" size={24} />
          </TouchableOpacity>
        </View>
      </ScrollView>
      <PrincipalBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  noSchoolContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noSchoolTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  noSchoolText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
  },
});
