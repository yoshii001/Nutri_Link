import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  listenToClassDonationRequests,
  approveClassDonationRequest,
  rejectClassDonationRequest,
} from '@/services/firebase/classDonationRequestService';
import { ClassDonationRequest } from '@/types';
import { theme } from '@/constants/theme';
import { CheckCircle, XCircle, Users, School, Calendar, DollarSign, X } from 'lucide-react-native';

export default function ClassRequestsScreen() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Record<string, ClassDonationRequest>>({});
  const [selectedRequest, setSelectedRequest] = useState<{
    id: string;
    request: ClassDonationRequest;
  } | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = listenToClassDonationRequests(user.uid, (data) => {
      setRequests(data);
    });

    return () => unsubscribe();
  }, [user]);

  const handleApprove = async (requestId: string) => {
    try {
      await approveClassDonationRequest(requestId);
      setShowDetailModal(false);
      Alert.alert('Success', 'You have approved this donation request');
    } catch (error) {
      console.error('Error approving request:', error);
      Alert.alert('Error', 'Failed to approve request');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectClassDonationRequest(requestId);
      setShowDetailModal(false);
      Alert.alert('Success', 'You have rejected this donation request');
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  const openDetailModal = (id: string, request: ClassDonationRequest) => {
    setSelectedRequest({ id, request });
    setShowDetailModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#FEF3C7', text: '#F59E0B' };
      case 'approved':
        return { bg: '#D1FAE5', text: '#10B981' };
      case 'rejected':
        return { bg: '#FEE2E2', text: '#EF4444' };
      default:
        return { bg: '#E5E7EB', text: '#6B7280' };
    }
  };

  const pendingRequests = Object.entries(requests).filter(
    ([_, req]) => req.status === 'pending'
  );
  const respondedRequests = Object.entries(requests).filter(
    ([_, req]) => req.status !== 'pending'
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Class Donation Requests</Text>
      </View>

      <ScrollView>
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            {pendingRequests.map(([id, request]) => (
              <TouchableOpacity
                key={id}
                style={styles.requestCard}
                onPress={() => openDetailModal(id, request)}
              >
                <View style={styles.requestHeader}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.className}>{request.className}</Text>
                    <Text style={styles.schoolName}>{request.schoolName}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(request.status).bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(request.status).text },
                      ]}
                    >
                      {request.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Users color={theme.colors.text.secondary} size={16} />
                    <Text style={styles.detailText}>
                      {request.numberOfStudents} Students
                    </Text>
                  </View>
                  {request.requestedAmount && (
                    <View style={styles.detailItem}>
                      <DollarSign color={theme.colors.text.secondary} size={16} />
                      <Text style={styles.detailText}>
                        ${request.requestedAmount.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>

                {request.purpose && (
                  <Text style={styles.purpose} numberOfLines={2}>
                    {request.purpose}
                  </Text>
                )}

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(id)}
                  >
                    <CheckCircle color="#fff" size={18} />
                    <Text style={styles.approveText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(id)}
                  >
                    <XCircle color="#fff" size={18} />
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {respondedRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Responded Requests</Text>
            {respondedRequests.map(([id, request]) => (
              <TouchableOpacity
                key={id}
                style={styles.requestCard}
                onPress={() => openDetailModal(id, request)}
              >
                <View style={styles.requestHeader}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.className}>{request.className}</Text>
                    <Text style={styles.schoolName}>{request.schoolName}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(request.status).bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(request.status).text },
                      ]}
                    >
                      {request.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Users color={theme.colors.text.secondary} size={16} />
                    <Text style={styles.detailText}>
                      {request.numberOfStudents} Students
                    </Text>
                  </View>
                  {request.requestedAmount && (
                    <View style={styles.detailItem}>
                      <DollarSign color={theme.colors.text.secondary} size={16} />
                      <Text style={styles.detailText}>
                        ${request.requestedAmount.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {Object.keys(requests).length === 0 && (
          <View style={styles.emptyContainer}>
            <Users color="#ccc" size={64} />
            <Text style={styles.emptyText}>No donation requests yet</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showDetailModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X color="#333" size={24} />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Class</Text>
                  <Text style={styles.detailValue}>{selectedRequest.request.className}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>School</Text>
                  <Text style={styles.detailValue}>{selectedRequest.request.schoolName}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Principal</Text>
                  <Text style={styles.detailValue}>
                    {selectedRequest.request.principalName}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Number of Students</Text>
                  <Text style={styles.detailValue}>
                    {selectedRequest.request.numberOfStudents}
                  </Text>
                </View>

                {selectedRequest.request.requestedAmount && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Requested Amount</Text>
                    <Text style={styles.detailValue}>
                      ${selectedRequest.request.requestedAmount.toFixed(2)}
                    </Text>
                  </View>
                )}

                {selectedRequest.request.purpose && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Purpose</Text>
                    <Text style={styles.detailValue}>{selectedRequest.request.purpose}</Text>
                  </View>
                )}

                {selectedRequest.request.description && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailValue}>
                      {selectedRequest.request.description}
                    </Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusColor(selectedRequest.request.status).bg,
                        alignSelf: 'flex-start',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(selectedRequest.request.status).text },
                      ]}
                    >
                      {selectedRequest.request.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {selectedRequest.request.status === 'pending' && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.approveButtonLarge}
                      onPress={() => handleApprove(selectedRequest.id)}
                    >
                      <CheckCircle color="#fff" size={20} />
                      <Text style={styles.approveTextLarge}>Approve Request</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButtonLarge}
                      onPress={() => handleReject(selectedRequest.id)}
                    >
                      <XCircle color="#fff" size={20} />
                      <Text style={styles.rejectTextLarge}>Reject Request</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
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
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
  },
  section: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  requestCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  requestInfo: {
    flex: 1,
  },
  className: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  schoolName: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: theme.spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  purpose: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  approveText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  rejectText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  emptyText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: theme.colors.text.primary,
  },
  detailSection: {
    marginBottom: theme.spacing.lg,
  },
  detailLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  detailValue: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  modalActions: {
    gap: 12,
    marginTop: theme.spacing.lg,
  },
  approveButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  approveTextLarge: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#fff',
  },
  rejectButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  rejectTextLarge: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#fff',
  },
});
