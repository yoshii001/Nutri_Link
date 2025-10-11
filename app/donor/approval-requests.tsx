import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ClipboardCheck, ArrowLeft, Users, CheckCircle, XCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  listenToReadyDonationsByDonor,
  approveDonationRequest,
  rejectDonationRequest,
  ReadyDonation,
} from '@/services/firebase/readyDonationService';
import { theme } from '@/constants/theme';

export default function ApprovalRequestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [donations, setDonations] = useState<Record<string, ReadyDonation>>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = listenToReadyDonationsByDonor(user.uid, (donationsData) => {
      setDonations(donationsData);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleApprove = async (donationId: string) => {
    Alert.alert(
      'Approve Request',
      'Are you sure you want to approve this donation request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              await approveDonationRequest(donationId);
              Alert.alert('Success', 'Request approved! Teachers can now claim this donation.');
            } catch (error) {
              console.error('Error approving request:', error);
              Alert.alert('Error', 'Failed to approve request');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (donationId: string) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this donation request? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectDonationRequest(donationId);
              Alert.alert('Success', 'Request has been rejected');
            } catch (error) {
              console.error('Error rejecting request:', error);
              Alert.alert('Error', 'Failed to reject request');
            }
          },
        },
      ]
    );
  };

  const sortedDonations = Object.entries(donations).sort(
    ([, a], [, b]) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const pendingDonations = sortedDonations.filter(([, d]) => d.status === 'pending');
  const approvedDonations = sortedDonations.filter(([, d]) => d.status === 'approved');
  const completedDonations = sortedDonations.filter(([, d]) => d.status === 'completed');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#FEF3C7', text: '#F59E0B' };
      case 'approved':
        return { bg: '#DBEAFE', text: '#3B82F6' };
      case 'completed':
        return { bg: '#D1FAE5', text: '#059669' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const renderDonationCard = (id: string, donation: ReadyDonation) => {
    const statusColors = getStatusColor(donation.status);
    const isPending = donation.status === 'pending';

    return (
      <View key={id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {donation.category?.toUpperCase() || 'DONATION'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {donation.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.itemName}>{donation.itemName || 'Donation Request'}</Text>
        {donation.description && (
          <Text style={styles.description}>{donation.description}</Text>
        )}

        <View style={styles.detailsContainer}>
          {donation.schoolName && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>School:</Text>
              <Text style={styles.detailValue}>{donation.schoolName}</Text>
            </View>
          )}

          {donation.className && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Class:</Text>
              <Text style={styles.detailValue}>{donation.className}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Students:</Text>
            <Text style={styles.detailValue}>
              <Users size={14} color={theme.colors.primary} /> {donation.numberOfStudents}
            </Text>
          </View>

          {donation.quantity && donation.unit && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quantity:</Text>
              <Text style={styles.detailValue}>
                {donation.quantity} {donation.unit}
              </Text>
            </View>
          )}

          {donation.principalName && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Principal:</Text>
              <Text style={styles.detailValue}>{donation.principalName}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Requested:</Text>
            <Text style={styles.detailValue}>
              {new Date(donation.createdAt).toLocaleDateString()}
            </Text>
          </View>

          {donation.approvedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Approved:</Text>
              <Text style={styles.detailValue}>
                {new Date(donation.approvedAt).toLocaleDateString()}
              </Text>
            </View>
          )}

          {donation.teacherName && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Claimed by:</Text>
              <Text style={styles.detailValue}>{donation.teacherName}</Text>
            </View>
          )}
        </View>

        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleReject(id)}
              activeOpacity={0.8}
            >
              <XCircle size={20} color="#DC2626" />
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => handleApprove(id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.approveButtonGradient}
              >
                <CheckCircle size={20} color={theme.colors.surface} />
                <Text style={styles.approveButtonText}>Approve</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={theme.colors.primary} strokeWidth={2} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={[theme.colors.primary, theme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <ClipboardCheck size={48} color={theme.colors.surface} strokeWidth={2} />
        <Text style={styles.headerTitle}>Approval Requests</Text>
        <Text style={styles.headerSubtitle}>Review and approve donation requests</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {sortedDonations.length === 0 ? (
          <View style={styles.emptyState}>
            <ClipboardCheck size={64} color={theme.colors.text.light} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No requests yet</Text>
            <Text style={styles.emptySubtext}>
              Schools will send requests for your donations
            </Text>
          </View>
        ) : (
          <>
            {pendingDonations.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Pending Approval</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{pendingDonations.length}</Text>
                  </View>
                </View>
                {pendingDonations.map(([id, donation]) => renderDonationCard(id, donation))}
              </View>
            )}

            {approvedDonations.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Approved</Text>
                  <View style={[styles.countBadge, { backgroundColor: '#DBEAFE' }]}>
                    <Text style={[styles.countText, { color: '#3B82F6' }]}>
                      {approvedDonations.length}
                    </Text>
                  </View>
                </View>
                {approvedDonations.map(([id, donation]) => renderDonationCard(id, donation))}
              </View>
            )}

            {completedDonations.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Completed</Text>
                  <View style={[styles.countBadge, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[styles.countText, { color: '#059669' }]}>
                      {completedDonations.length}
                    </Text>
                  </View>
                </View>
                {completedDonations.map(([id, donation]) => renderDonationCard(id, donation))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
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
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
  },
  countBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
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
    marginBottom: theme.spacing.md,
  },
  categoryBadge: {
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  itemName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  detailsContainer: {
    marginTop: theme.spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
    flexShrink: 1,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: '#DC2626',
    backgroundColor: theme.colors.surface,
  },
  rejectButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#DC2626',
  },
  approveButton: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  approveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
  },
  approveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
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
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
});
