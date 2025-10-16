import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FileText,
  School,
  Calendar,
  DollarSign,
  X,
  ArrowLeft,
  Filter,
  TrendingUp,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveDonationRequests, updateFulfilledAmount } from '@/services/firebase/donationRequestService';
import { DonationRequest } from '@/types';
import { theme } from '@/constants/theme';

export default function ViewRequestsScreen() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [requests, setRequests] = useState<Record<string, DonationRequest>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'fulfilled'>('active');
  const [selectedRequest, setSelectedRequest] = useState<{
    id: string;
    request: DonationRequest;
  } | null>(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [showDonateModal, setShowDonateModal] = useState(false);

  const loadData = async () => {
    try {
      const activeRequests = await getActiveDonationRequests();
      setRequests(activeRequests);
    } catch (error) {
      console.error('Error loading donation requests:', error);
      Alert.alert('Error', 'Failed to load donation requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDonate = (requestId: string, request: DonationRequest) => {
    setSelectedRequest({ id: requestId, request });
    setShowDonateModal(true);
    setDonationAmount('');
  };

  const handleConfirmDonation = async () => {
    if (!selectedRequest || !user || !userData) {
      Alert.alert('Error', 'Missing required information');
      return;
    }

    const amount = parseFloat(donationAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid donation amount');
      return;
    }

    const remainingAmount =
      selectedRequest.request.requestedAmount - selectedRequest.request.fulfilledAmount;

    if (amount > remainingAmount) {
      Alert.alert(
        'Error',
        `The donation amount cannot exceed the remaining amount of Rs. ${remainingAmount.toFixed(2)}`
      );
      return;
    }

    try {
      setLoading(true);

      // Update the fulfilled amount in the donation request
      await updateFulfilledAmount(selectedRequest.id, amount);

      // Optionally, create a donation record
      const { addDonation } = await import('@/services/firebase/donationService');
      await addDonation({
        donorId: user.uid,
        donorName: userData.name,
        donorEmail: userData.email,
        schoolId: selectedRequest.request.schoolId,
        mealPlanId: selectedRequest.request.mealPlanId,
        amount: amount,
        mealContribution: Math.floor(amount / 5), // Assuming $5 per meal
        date: new Date().toISOString(),
        status: 'completed',
        donorMessage: `Donation towards: ${selectedRequest.request.purpose}`,
      });

      Alert.alert(
        'Success',
        `Thank you for your donation of Rs. ${amount.toFixed(2)}!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowDonateModal(false);
              setSelectedRequest(null);
              loadData();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error processing donation:', error);
      Alert.alert('Error', 'Failed to process donation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = Object.entries(requests).filter(([_, request]) => {
    if (filterStatus === 'all') return true;
    return request.status === filterStatus;
  });

  const getProgressPercentage = (request: DonationRequest) => {
    return (request.fulfilledAmount / request.requestedAmount) * 100;
  };

  const getRemainingAmount = (request: DonationRequest) => {
    return request.requestedAmount - request.fulfilledAmount;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.primary} strokeWidth={2} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
        <FileText size={48} color={theme.colors.surface} strokeWidth={2} />
        <Text style={styles.headerTitle}>All Donation Requests</Text>
        <Text style={styles.headerSubtitle}>Schools seeking support</Text>
      </LinearGradient>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === 'all' && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'active' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('active')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === 'active' && styles.filterButtonTextActive,
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterStatus === 'fulfilled' && styles.filterButtonActive,
            ]}
            onPress={() => setFilterStatus('fulfilled')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === 'fulfilled' && styles.filterButtonTextActive,
              ]}
            >
              Fulfilled
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={64} color={theme.colors.text.light} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No donation requests</Text>
            <Text style={styles.emptySubtext}>Check back later for new requests</Text>
          </View>
        ) : (
          filteredRequests
            .sort(([, a], [, b]) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(([id, request]) => {
              const progressPercentage = getProgressPercentage(request);
              const remainingAmount = getRemainingAmount(request);

              return (
                <View key={id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.schoolInfo}>
                      <School size={20} color={theme.colors.primary} />
                      <Text style={styles.schoolName}>{request.schoolName}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        request.status === 'active' && styles.statusActive,
                        request.status === 'fulfilled' && styles.statusFulfilled,
                      ]}
                    >
                      <Text style={styles.statusText}>{request.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={styles.purpose}>{request.purpose}</Text>
                  <Text style={styles.description} numberOfLines={2}>
                    {request.description}
                  </Text>

                  <View style={styles.amountContainer}>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Requested:</Text>
                      <Text style={styles.amountValue}>
                        Rs. {request.requestedAmount.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Fulfilled:</Text>
                      <Text style={styles.amountFulfilled}>
                        Rs. {request.fulfilledAmount.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Remaining:</Text>
                      <Text style={styles.amountRemaining}>
                        Rs. {remainingAmount.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(progressPercentage, 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>{progressPercentage.toFixed(0)}%</Text>
                  </View>

                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <Calendar size={16} color={theme.colors.text.secondary} />
                      <Text style={styles.detailText}>
                        Target: {new Date(request.targetDate).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.principalText}>By: {request.principalName}</Text>
                    </View>
                  </View>

                  {request.status === 'active' && remainingAmount > 0 && (
                    <TouchableOpacity
                      style={styles.donateButton}
                      onPress={() => handleDonate(id, request)}
                      activeOpacity={0.8}
                    >
                      <DollarSign size={20} color={theme.colors.surface} />
                      <Text style={styles.donateButtonText}>Donate Now</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
        )}
      </ScrollView>

      {/* Donation Modal */}
      <Modal
        visible={showDonateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDonateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Make a Donation</Text>
              <TouchableOpacity onPress={() => setShowDonateModal(false)}>
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestSchool}>{selectedRequest.request.schoolName}</Text>
                  <Text style={styles.requestPurpose}>{selectedRequest.request.purpose}</Text>
                  <View style={styles.requestAmounts}>
                    <Text style={styles.requestAmountLabel}>
                      Remaining: Rs. {getRemainingAmount(selectedRequest.request).toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Donation Amount (Rs.)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    value={donationAmount}
                    onChangeText={setDonationAmount}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowDonateModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleConfirmDonation}
                    disabled={loading}
                  >
                    <Text style={styles.confirmButtonText}>
                      {loading ? 'Processing...' : 'Confirm Donation'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontFamily: 'Inter-Medium',
  },
  header: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
    marginTop: theme.spacing.md,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.surface,
    marginTop: theme.spacing.xs,
    opacity: 0.9,
  },
  filterContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    marginRight: theme.spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.text.secondary,
  },
  filterButtonTextActive: {
    color: theme.colors.surface,
  },
  content: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  schoolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  schoolName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusActive: {
    backgroundColor: '#FEF3C7',
  },
  statusFulfilled: {
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
  },
  purpose: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  amountContainer: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  amountLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  amountValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
  },
  amountFulfilled: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.success,
  },
  amountRemaining: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.success,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.secondary,
    width: 40,
    textAlign: 'right',
  },
  detailsRow: {
    marginBottom: theme.spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  principalText: {
    fontSize: 12,
    color: theme.colors.text.light,
    fontStyle: 'italic',
  },
  donateButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  donateButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.surface,
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
    padding: theme.spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
  },
  requestInfo: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  requestSchool: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  requestPurpose: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  requestAmounts: {
    marginTop: theme.spacing.sm,
  },
  requestAmountLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.secondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.surface,
  },
});
