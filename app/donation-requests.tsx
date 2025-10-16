import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, School, Calendar, Check, X, ArrowLeft, Hop as Home, Plus, Heart } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getPendingReadyDonationsByDonorId, ReadyDonation } from '@/services/firebase/readyDonationService';
import { getPublishedDonationsByDonorId } from '@/services/firebase/publishedDonationService';
import { PublishedDonation } from '@/types';
import { theme } from '@/constants/theme';

export default function DonationRequestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [requests, setRequests] = useState<Record<string, ReadyDonation>>({});
  const [myDonations, setMyDonations] = useState<Record<string, PublishedDonation>>({});
  const [approvedRequests, setApprovedRequests] = useState<Record<string, ReadyDonation>>({});
  const [viewMode, setViewMode] = useState<'requests' | 'approved'>('requests');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{
    id: string;
    request: ReadyDonation;
  } | null>(null);

  const loadData = async () => {
    if (!user) return;
    try {
      const [allReadyDonations, donationsData] = await Promise.all([
        (async () => {
          const { getAllReadyDonations } = await import('@/services/firebase/readyDonationService');
          return getAllReadyDonations();
        })(),
        getPublishedDonationsByDonorId(user.uid),
      ]);

  const requestsForThisDonor: Record<string, ReadyDonation> = {};
  const approvedForThisDonor: Record<string, ReadyDonation> = {};

      for (const [id, request] of Object.entries(allReadyDonations)) {
        if (request.status === 'pending') {
          const publishedDonation = donationsData[request.publishedDonationId];

          if (publishedDonation && publishedDonation.donorId === user.uid) {
            const enrichedRequest = { ...request };

            if (request.classId && request.principalId) {
              try {
                const { getSchoolByPrincipalId } = await import('@/services/firebase/schoolService');
                const schoolData = await getSchoolByPrincipalId(request.principalId);

                if (schoolData) {
                  enrichedRequest.schoolId = schoolData.id;
                  enrichedRequest.schoolName = schoolData.school.name;
                  enrichedRequest.principalName = schoolData.school.principalName;

                  const { getClassById } = await import('@/services/firebase/classService');
                  const classData = await getClassById(schoolData.id, request.classId);

                  if (classData) {
                    enrichedRequest.className = classData.className;
                  }
                }
              } catch (error) {
                console.error('Error fetching school/class data:', error);
              }
            }

            requestsForThisDonor[id] = enrichedRequest;
            }
          }
          // collect approved requests referencing this donor's published donations
          else if (request.status === 'approved') {
            const publishedDonation = donationsData[request.publishedDonationId];
            if (publishedDonation && publishedDonation.donorId === user.uid) {
              const enrichedRequest = { ...request } as ReadyDonation & any;
              try {
                if (request.classId && request.principalId) {
                  const { getSchoolByPrincipalId } = await import('@/services/firebase/schoolService');
                  const schoolData = await getSchoolByPrincipalId(request.principalId);
                  if (schoolData) {
                    enrichedRequest.schoolId = schoolData.id;
                    enrichedRequest.schoolName = schoolData.school.name;
                    enrichedRequest.principalName = schoolData.school.principalName;
                    const { getClassById } = await import('@/services/firebase/classService');
                    const classData = await getClassById(schoolData.id, request.classId);
                    if (classData) enrichedRequest.className = classData.className;
                  }
                }
              } catch (error) {
                console.error('Error fetching school/class data for approved:', error);
              }
              approvedForThisDonor[id] = enrichedRequest;
            }
        }
      }

        setRequests(requestsForThisDonor);
        setApprovedRequests(approvedForThisDonor);
        setMyDonations(donationsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleApprove = async (requestId: string) => {
    console.log('handleApprove called with requestId:', requestId);
    try {
      console.log('Approving donation request:', requestId);
      const { approveDonationRequest } = await import('@/services/firebase/readyDonationService');
      await approveDonationRequest(requestId);
      console.log('Donation approved successfully');
      setSelectedRequest(null);
      await loadData();
      Alert.alert('Success', 'Donation request approved! Teachers can now claim it.');
    } catch (error: any) {
      console.error('Error approving request:', error);
      Alert.alert('Error', error.message || 'Failed to approve request');
    }
  };

  const handleReject = async (requestId: string) => {
    console.log('handleReject called with requestId:', requestId);
    try {
      const { rejectDonationRequest } = await import('@/services/firebase/readyDonationService');
      await rejectDonationRequest(requestId);
      await loadData();
      setSelectedRequest(null);
      Alert.alert('Success', 'Donation request rejected');
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/(tabs)/dashboard')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={theme.colors.primary} strokeWidth={2} />
          <Text style={styles.backButtonText}>Dashboard</Text>
        </TouchableOpacity>
      </View>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Bell size={48} color={theme.colors.surface} strokeWidth={2} />
        <Text style={styles.headerTitle}>Donation Requests</Text>
        <Text style={styles.headerSubtitle}>Schools that need your help</Text>
      </LinearGradient>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{Object.keys(requests).length}</Text>
          <Text style={styles.statLabel}>Active Requests</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {Object.values(myDonations).filter((d) => d.status === 'available').length}
          </Text>
          <Text style={styles.statLabel}>My Available Items</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {viewMode === 'requests' ? (
          Object.keys(requests).length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={64} color={theme.colors.text.light} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No active requests</Text>
            <Text style={styles.emptySubtext}>Check back later for schools in need</Text>
          </View>
          ) : (
            Object.entries(requests)
            .sort(
              ([, a], [, b]) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )
            .map(([id, request]) => {
              const publishedDonation = myDonations[request.publishedDonationId];
              const isUrgent = false;

              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.card]}
                  onPress={() => setSelectedRequest({ id, request })}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.schoolInfo}>
                      <School size={24} color={theme.colors.primary} />
                      <View style={styles.schoolDetails}>
                        <Text style={styles.schoolName}>{request.schoolName || 'School'}</Text>
                        <Text style={styles.principalName}>Principal: {request.principalName || 'N/A'}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.requestDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Your Item:</Text>
                      <Text style={styles.detailValue}>
                        {publishedDonation?.itemName || 'Item'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Class:</Text>
                      <Text style={styles.detailValue}>{request.className || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Students:</Text>
                      <Text style={[styles.detailValue, styles.remainingValue]}>
                        {request.numberOfStudents}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.dateInfo}>
                      <Calendar size={16} color={theme.colors.text.light} />
                      <Text style={styles.dateText}>
                        Requested on {new Date(request.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => {
                        console.log('Approve button pressed for ID:', id);
                        handleApprove(id);
                      }}
                      activeOpacity={0.8}
                    >
                      <Check size={18} color={theme.colors.surface} />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => {
                        console.log('Reject button pressed for ID:', id);
                        handleReject(id);
                      }}
                      activeOpacity={0.8}
                    >
                      <X size={18} color={theme.colors.surface} />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )
        ) : (
          // Approved schools view
          Object.keys(approvedRequests).length === 0 ? (
            <View style={styles.emptyState}>
              <Bell size={64} color={theme.colors.text.light} strokeWidth={1.5} />
              <Text style={styles.emptyText}>No approved schools yet</Text>
              <Text style={styles.emptySubtext}>Approved requests will appear here</Text>
            </View>
          ) : (
            Object.entries(approvedRequests)
              .sort(([, a], [, b]) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(([id, request]) => {
                const publishedDonation = myDonations[request.publishedDonationId];
                return (
                  <View key={id} style={[styles.card]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.schoolInfo}>
                        <School size={24} color={theme.colors.primary} />
                        <View style={styles.schoolDetails}>
                          <Text style={styles.schoolName}>{request.schoolName || 'School'}</Text>
                          <Text style={styles.principalName}>Principal: {request.principalName || 'N/A'}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.requestDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Donation Type:</Text>
                        <Text style={styles.detailValue}>{publishedDonation?.category || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Status:</Text>
                        <Text style={styles.detailValue}>{request.status}</Text>
                      </View>
                    </View>

                    <View style={styles.cardFooter}>
                      <View style={styles.dateInfo}>
                        <Calendar size={16} color={theme.colors.text.light} />
                        <Text style={styles.dateText}>
                          Approved on {new Date(request.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actionButtons}> 
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => setSelectedRequest({ id, request })}
                        activeOpacity={0.8}
                      >
                        <Heart size={18} color={theme.colors.surface} />
                        <Text style={styles.viewButtonText}>View Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
          )
        )}
      </ScrollView>

      <Modal
        visible={!!selectedRequest}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedRequest(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRequest && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Request Details</Text>
                  <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                    <X size={24} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>School</Text>
                    <Text style={styles.modalValue}>{selectedRequest.request.schoolName || 'N/A'}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Principal</Text>
                    <Text style={styles.modalValue}>{selectedRequest.request.principalName || 'N/A'}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Your Item</Text>
                    <Text style={styles.modalValue}>
                      {myDonations[selectedRequest.request.publishedDonationId]?.itemName || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Class</Text>
                    <Text style={styles.modalValue}>{selectedRequest.request.className || 'N/A'}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Number of Students</Text>
                    <Text style={[styles.modalValue, styles.highlightValue]}>
                      {selectedRequest.request.numberOfStudents}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Requested On</Text>
                    <Text style={styles.modalValue}>
                      {new Date(selectedRequest.request.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  {selectedRequest.request.notes && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Notes</Text>
                      <Text style={styles.modalValue}>{selectedRequest.request.notes}</Text>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, { marginBottom: theme.spacing.sm }]}
                    onPress={() => handleApprove(selectedRequest.id)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[theme.colors.primary, theme.colors.accent]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.modalButtonGradient}
                    >
                      <Check size={20} color={theme.colors.surface} />
                      <Text style={styles.modalButtonText}>Approve Request</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButtonModal}
                    onPress={() => handleReject(selectedRequest.id)}
                    activeOpacity={0.8}
                  >
                    <X size={20} color={theme.colors.error} />
                    <Text style={styles.rejectButtonModalText}>Reject Request</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/(tabs)/dashboard')}
          activeOpacity={0.7}
        >
          <Home size={24} color={theme.colors.text.secondary} strokeWidth={2} />
          <Text style={styles.navButtonText}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setViewMode(viewMode === 'requests' ? 'approved' : 'requests')}
          activeOpacity={0.7}
        >
          <Heart size={24} color={theme.colors.text.secondary} strokeWidth={2} />
          <Text style={styles.navButtonText}>{viewMode === 'requests' ? 'Approved Schools' : 'Requests'}</Text>
        </TouchableOpacity>
      </View>
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
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: 8,
    paddingTop: 8,
    ...theme.shadows.lg,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
  },
  navButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  viewButtonText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: theme.spacing.xs,
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
  statsCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginTop: -theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    ...theme.shadows.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  statValue: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.secondary,
    textAlign: 'center',
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
  cardUrgent: {
    borderWidth: 2,
    borderColor: theme.colors.error,
  },
  urgentBadge: {
    position: 'absolute',
    top: -8,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  urgentBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
    letterSpacing: 0.5,
  },
  cardHeader: {
    marginBottom: theme.spacing.md,
  },
  schoolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  schoolDetails: {
    flex: 1,
  },
  schoolName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
  },
  principalName: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
  },
  purpose: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  requestDetails: {
    backgroundColor: `${theme.colors.primary}08`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
  },
  remainingValue: {
    color: theme.colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: `${theme.colors.primary}15`,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dateText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
  },
  daysRemaining: {
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  daysText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: theme.colors.primary,
  },
  daysTextUrgent: {
    color: theme.colors.error,
  },
  donateButton: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  donateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm + 2,
  },
  donateButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  approveButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  rejectButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
  },
  rejectButtonModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.surface,
  },
  rejectButtonModalText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: theme.colors.error,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
  },
  modalBody: {
    padding: theme.spacing.lg,
  },
  modalSection: {
    marginBottom: theme.spacing.md,
  },
  modalLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  modalValue: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.primary,
  },
  highlightValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.primary,
  },
  modalActions: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  modalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
  },
});