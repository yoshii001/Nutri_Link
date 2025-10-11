import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Package, ArrowLeft, Users, CheckCircle, Home, Settings, User, LogOut, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { getTeacherByUserId } from '@/services/firebase/teacherService';
import {
  listenToReadyDonationsBySchool,
  claimDonationByTeacher,
  ReadyDonation,
} from '@/services/firebase/readyDonationService';
import { theme } from '@/constants/theme';

export default function ClaimDonationsScreen() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [teacherId, setTeacherId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');
  const [donations, setDonations] = useState<Record<string, ReadyDonation>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null);
  const [claimMessage, setClaimMessage] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const teacherData = await getTeacherByUserId(user.uid);
        if (!teacherData) {
          Alert.alert('Error', 'Teacher profile not found');
          return;
        }

        setTeacherId(teacherData.id);
        setSchoolId(teacherData.teacher.schoolId);
        setClassId(teacherData.teacher.classId || '');

        const unsubscribe = listenToReadyDonationsBySchool(
          teacherData.teacher.schoolId,
          (donationsData) => {
            const availableDonations: Record<string, ReadyDonation> = {};
            Object.entries(donationsData).forEach(([id, donation]) => {
              if (donation.status === 'approved' || donation.teacherId === user.uid) {
                availableDonations[id] = donation;
              }
            });
            setDonations(availableDonations);
          }
        );

        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('Error loading data:', error);
      }
    })();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleClaim = async (donationId: string, donation: ReadyDonation) => {
    console.log('handleClaim called', { donationId, classId, donation });
    if (!user || !userData) {
      console.log('No user or userData');
      return;
    }

    if (!classId) {
      Alert.alert('Error', 'You are not assigned to a class. Please contact your principal.');
      return;
    }

    console.log('Checking if donation classId matches', { donationClassId: donation.classId, myClassId: classId });

    if (donation.classId !== classId) {
      console.log('Class does not match, showing confirmation dialog');
      Alert.alert(
        'Different Class',
        `This donation is assigned to ${donation.className}, but you teach a different class. Do you still want to claim it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Claim',
            onPress: () => performClaim(donationId),
          },
        ]
      );
    } else {
      console.log('Class matches, proceeding to performClaim');
      performClaim(donationId);
    }
  };

  const performClaim = async (donationId: string) => {
    console.log('performClaim called', { donationId, schoolId, classId });
    if (!user || !userData) {
      console.log('No user or userData in performClaim');
      return;
    }

    setSelectedDonationId(donationId);
    setClaimMessage('Claim this donation for your class?');
    setShowClaimModal(true);
  };

  const confirmClaim = async () => {
    if (!selectedDonationId || !user || !userData) return;

    setIsClaiming(true);
    try {
      console.log('Attempting to claim donation...');
      await claimDonationByTeacher(selectedDonationId, user.uid, userData.name);
      console.log('Claim successful, showing success alert');
      setShowClaimModal(false);
      setSelectedDonationId(null);
      setIsClaiming(false);

      if (Platform.OS === 'web') {
        alert('Success: Donation claimed successfully!');
      } else {
        Alert.alert('Success', 'Donation claimed successfully!');
      }
    } catch (error) {
      console.error('Error claiming donation:', error);
      setIsClaiming(false);
      setShowClaimModal(false);

      if (Platform.OS === 'web') {
        alert('Error: Failed to claim donation');
      } else {
        Alert.alert('Error', 'Failed to claim donation');
      }
    }
  };

  const cancelClaim = () => {
    setShowClaimModal(false);
    setSelectedDonationId(null);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace('/login');
          } catch (error) {
            console.error('Error logging out:', error);
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
  };

  const sortedDonations = Object.entries(donations).sort(
    ([, a], [, b]) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

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
        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={styles.topBarButton}
            onPress={() => router.push('/profile')}
            activeOpacity={0.7}
          >
            <User size={22} color={theme.colors.text.secondary} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topBarButton}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <Settings size={22} color={theme.colors.text.secondary} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topBarButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut size={22} color={theme.colors.error} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <LinearGradient
        colors={[theme.colors.primary, theme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Package size={48} color={theme.colors.surface} strokeWidth={2} />
        <Text style={styles.headerTitle}>Claim Donations</Text>
        <Text style={styles.headerSubtitle}>Manage donations for your students</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {sortedDonations.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={64} color={theme.colors.text.light} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No donations available</Text>
            <Text style={styles.emptySubtext}>Approved donations will appear here</Text>
          </View>
        ) : (
          sortedDonations.map(([id, donation]) => {
            const statusColors = getStatusColor(donation.status);
            const canClaim = donation.status === 'approved';
            const isClaimed = donation.status === 'completed';
            const isMyDonation = donation.teacherId === user?.uid;
            const isMyClass = donation.classId === classId;

            return (
              <View key={id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.donorBadge}>
                    <Text style={styles.donorBadgeText}>
                      {(donation.category || 'DONATION').toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                    <Text style={[styles.statusText, { color: statusColors.text }]}>
                      {donation.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.itemName}>{donation.itemName}</Text>
                <Text style={styles.description}>{donation.description}</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Quantity:</Text>
                  <Text style={styles.detailValue}>
                    {donation.quantity} {donation.unit}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Class:</Text>
                  <Text style={styles.detailValue}>
                    {donation.className || 'No class assigned'}
                    {isMyClass && donation.className && donation.className !== 'No class assigned' && (
                      <Text style={styles.myClassTag}> (Your Class)</Text>
                    )}
                  </Text>
                </View>

                <View style={styles.mealCoverageBox}>
                  <Users size={20} color={theme.colors.primary} strokeWidth={2.5} />
                  <View style={styles.mealCoverageContent}>
                    <Text style={styles.mealCoverageLabel}>Meal Coverage</Text>
                    <Text style={styles.mealCoverageValue}>
                      Can serve {donation.numberOfStudents} students
                    </Text>
                    <Text style={styles.mealCoverageDetails}>
                      {donation.quantity} {donation.unit} available
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Donor:</Text>
                  <Text style={styles.detailValue}>{donation.donorName}</Text>
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

                {donation.location && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Pickup Location:</Text>
                    <Text style={styles.notesText}>{donation.location}</Text>
                  </View>
                )}

                {canClaim && (
                  <TouchableOpacity
                    style={styles.claimButton}
                    onPress={() => handleClaim(id, donation)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[theme.colors.primary, theme.colors.accent]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.claimButtonGradient}
                    >
                      <Package size={20} color={theme.colors.surface} />
                      <Text style={styles.claimButtonText}>Claim as Meal</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {isClaimed && (
                  <View style={[styles.infoBox, { backgroundColor: '#D1FAE5' }]}>
                    <CheckCircle size={20} color="#059669" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoText, { color: '#059669' }]}>
                        {isMyDonation ? 'You claimed this donation' : 'Claimed by another teacher'}
                      </Text>
                      {donation.completedAt && (
                        <Text style={[styles.infoSubtext, { color: '#059669' }]}>
                          {new Date(donation.completedAt).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/teacher/dashboard')}
          activeOpacity={0.7}
        >
          <Home size={24} color={theme.colors.text.secondary} strokeWidth={2} />
          <Text style={styles.navButtonText}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/teacher/students')}
          activeOpacity={0.7}
        >
          <Users size={24} color={theme.colors.text.secondary} strokeWidth={2} />
          <Text style={styles.navButtonText}>Students</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => router.push('/teacher/claim-donations')}
          activeOpacity={0.7}
        >
          <Package size={24} color={theme.colors.primary} strokeWidth={2} />
          <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Donations</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/profile')}
          activeOpacity={0.7}
        >
          <User size={24} color={theme.colors.text.secondary} strokeWidth={2} />
          <Text style={styles.navButtonText}>Profile</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showClaimModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelClaim}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Claim Donation</Text>
              <TouchableOpacity onPress={cancelClaim} style={styles.modalCloseButton}>
                <X size={24} color={theme.colors.text.secondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalMessage}>{claimMessage}</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={cancelClaim}
                disabled={isClaiming}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmClaim}
                disabled={isClaiming}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonConfirmText}>
                    {isClaiming ? 'Claiming...' : 'Claim'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  topBarButton: {
    padding: theme.spacing.xs,
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
  navButtonActive: {
    borderTopWidth: 2,
    borderTopColor: theme.colors.primary,
  },
  navButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  navButtonTextActive: {
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
  donorBadge: {
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  donorBadgeText: {
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
  myClassTag: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
  },
  mealCoverageBox: {
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
  mealCoverageContent: {
    flex: 1,
  },
  mealCoverageLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  mealCoverageValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  mealCoverageDetails: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
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
  },
  notesBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  notesLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.primary,
  },
  claimButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
    ...theme.shadows.md,
  },
  claimButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  claimButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
  },
  infoBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  infoSubtext: {
    fontSize: 13,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
  },
  modalCloseButton: {
    padding: theme.spacing.xs,
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  modalButtonCancel: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.secondary,
  },
  modalButtonConfirm: {
    ...theme.shadows.sm,
  },
  modalButtonGradient: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
  },
});
