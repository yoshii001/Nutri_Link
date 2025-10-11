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
import { Package, ArrowLeft, CheckCircle, XCircle, School, Users, Calendar } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllReadyDonations,
  approveDonationRequest,
  rejectDonationRequest,
  ReadyDonation,
} from '@/services/firebase/readyDonationService';
import { getPublishedDonationById } from '@/services/firebase/publishedDonationService';
import { PublishedDonation } from '@/types';
import { getClassById } from '@/services/firebase/classService';
import { theme } from '@/constants/theme';

type RequestWithDetails = ReadyDonation & {
  donation?: PublishedDonation;
  className?: string;
};

export default function AssignmentRequestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [requests, setRequests] = useState<Record<string, RequestWithDetails>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    if (!user) return;

    try {
      const allRequests = await getAllReadyDonations();
      const enrichedRequests: Record<string, RequestWithDetails> = {};

      for (const [id, request] of Object.entries(allRequests)) {
        if (request.status !== 'pending') continue;

        const donation = await getPublishedDonationById(request.publishedDonationId);
        if (!donation || donation.donorId !== user.uid) continue;

  // getClassById expects (schoolId, classId)
  const classInfo = await getClassById(request.schoolId || '', request.classId);

        enrichedRequests[id] = {
          ...request,
          donation,
          className: classInfo?.className || 'Unknown Class',
        };
      }

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleApprove = async (requestId: string, request: RequestWithDetails) => {
    Alert.alert(
      'Approve Request',
      `Approve donation request for ${request.className}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await approveDonationRequest(requestId);
              Alert.alert('Success', 'Donation request approved! Teachers can now claim it.');
              await loadRequests();
            } catch (error) {
              console.error('Error approving request:', error);
              Alert.alert('Error', 'Failed to approve request');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (requestId: string, request: RequestWithDetails) => {
    Alert.alert(
      'Reject Request',
      `Reject donation request for ${request.className}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectDonationRequest(requestId, 'Rejected by donor');
              Alert.alert('Success', 'Donation request rejected');
              await loadRequests();
            } catch (error) {
              console.error('Error rejecting request:', error);
              Alert.alert('Error', 'Failed to reject request');
            }
          },
        },
      ]
    );
  };

  const sortedRequests = Object.entries(requests).sort(
    ([, a], [, b]) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

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
        <Package size={48} color={theme.colors.surface} strokeWidth={2} />
        <Text style={styles.headerTitle}>Assignment Requests</Text>
        <Text style={styles.headerSubtitle}>Approve school donation requests</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {sortedRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={64} color={theme.colors.text.light} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No pending requests</Text>
            <Text style={styles.emptySubtext}>Schools will request your donations here</Text>
          </View>
        ) : (
          sortedRequests.map(([id, request]) => {
            const donation = request.donation;
            if (!donation) return null;

            return (
              <View key={id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>PENDING APPROVAL</Text>
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{donation.category.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.itemName}>{donation.itemName}</Text>
                <Text style={styles.description}>{donation.description}</Text>

                <View style={styles.infoSection}>
                  <View style={styles.infoRow}>
                    <Package size={18} color={theme.colors.text.secondary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Class</Text>
                      <Text style={styles.infoValue}>{request.className}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Users size={18} color={theme.colors.text.secondary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Students</Text>
                      <Text style={styles.infoValue}>{request.numberOfStudents}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Package size={18} color={theme.colors.text.secondary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Quantity</Text>
                      <Text style={styles.infoValue}>
                        {donation.quantity} {donation.unit}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Calendar size={18} color={theme.colors.text.secondary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Requested</Text>
                      <Text style={styles.infoValue}>
                        {new Date(request.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(id, request)}
                    activeOpacity={0.8}
                  >
                    <XCircle size={20} color="#EF4444" />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(id, request)}
                    activeOpacity={0.8}
                  >
                    <CheckCircle size={20} color="#10B981" />
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
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
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  itemName: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  infoSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoContent: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.light,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
  },
  principalInfo: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  principalLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  principalName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: '#FEE2E2',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  rejectButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: '#D1FAE5',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  approveButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
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
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#666',
  },
});
