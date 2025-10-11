import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Package, ArrowLeft, Users, Calendar, MapPin, User, X } from 'lucide-react-native';
import PrincipalBottomNav from '@/components/PrincipalBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { getSchoolByPrincipalId } from '@/services/firebase/schoolService';
import { getAvailablePublishedDonations } from '@/services/firebase/publishedDonationService';
import { createDonationAssignmentDirect, listenToSchoolAssignments } from '@/services/firebase/donationAssignmentService';
import { getClassesBySchoolId } from '@/services/firebase/classService';
import { PublishedDonation, DonationAssignment, ClassInfo } from '@/types';
import { theme } from '@/constants/theme';

export default function AssignDonationsScreen() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [schoolId, setSchoolId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [donations, setDonations] = useState<Record<string, PublishedDonation>>({});
  const [classes, setClasses] = useState<Record<string, ClassInfo>>({});
  const [assignments, setAssignments] = useState<Record<string, DonationAssignment>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<{ id: string; donation: PublishedDonation } | null>(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const loadData = async () => {
    if (!user) return;

    try {
      const schoolData = await getSchoolByPrincipalId(user.uid);
      if (!schoolData) return;

      setSchoolId(schoolData.id);
      setSchoolName(schoolData.school.name);

      const foodDonations = await getAvailablePublishedDonations();
      const filteredDonations: Record<string, PublishedDonation> = {};
      Object.entries(foodDonations).forEach(([id, donation]) => {
        if (donation.category === 'food' && donation.numberOfStudents && donation.numberOfStudents > 0) {
          const remaining = donation.remainingStudents ?? donation.numberOfStudents;
          if (remaining > 0) {
            filteredDonations[id] = donation;
          }
        }
      });
      setDonations(filteredDonations);

      const classesData = await getClassesBySchoolId(schoolData.id);
      setClasses(classesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    loadData();

    (async () => {
      const schoolData = await getSchoolByPrincipalId(user.uid);
      if (!schoolData) return;

      const unsubscribe = listenToSchoolAssignments(schoolData.id, (assignmentsData) => {
        setAssignments(assignmentsData);
      });

      return () => {
        unsubscribe();
      };
    })();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAssignDonation = (donationId: string, donation: PublishedDonation) => {
    if (Object.keys(classes).length === 0) {
      Alert.alert('No Classes', 'Please create classes before assigning donations');
      return;
    }
    setSelectedDonation({ id: donationId, donation });
    setShowClassModal(true);
  };

  const handleAssignToClass = async (classId: string, classInfo: ClassInfo) => {
    if (!selectedDonation || !user || !userData) {
      Alert.alert('Error', 'Missing required data. Please try again.');
      return;
    }

    if (isAssigning) {
      console.log('Already assigning, please wait...');
      return;
    }

    const remaining = selectedDonation.donation.remainingStudents ?? selectedDonation.donation.numberOfStudents ?? 0;

    if (classInfo.numberOfStudents > remaining) {
      Alert.alert(
        'Insufficient Capacity',
        `This donation can only feed ${remaining} students, but the class has ${classInfo.numberOfStudents} students. The donation will be assigned but may not be enough for all students.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Assign Anyway',
            onPress: () => performAssignment(classId, classInfo),
          },
        ]
      );
    } else {
      await performAssignment(classId, classInfo);
    }
  };

  const performAssignment = async (classId: string, classInfo: ClassInfo) => {
    if (!selectedDonation || !user || !userData) {
      console.log('Missing data:', { selectedDonation: !!selectedDonation, user: !!user, userData: !!userData });
      Alert.alert('Error', 'Missing required data. Please try again.');
      return;
    }

    if (isAssigning) {
      console.log('Assignment already in progress');
      return;
    }

    setIsAssigning(true);

    console.log('Starting assignment with data:', {
      publishedDonationId: selectedDonation.id,
      donorId: selectedDonation.donation.donorId,
      classId,
      className: classInfo.className,
    });

    try {
      const assignmentData = {
        publishedDonationId: selectedDonation.id,
        donorId: selectedDonation.donation.donorId,
        donorName: selectedDonation.donation.donorName,
        principalId: user.uid,
        principalName: userData.name,
        schoolId: schoolId,
        schoolName: schoolName,
        classId: classId,
        className: classInfo.className,
        numberOfStudents: classInfo.numberOfStudents,
        itemName: selectedDonation.donation.itemName,
        quantity: selectedDonation.donation.quantity,
        unit: selectedDonation.donation.unit,
      };

      console.log('Assignment data prepared:', assignmentData);

      const assignmentId = await createDonationAssignmentDirect(assignmentData);

      console.log('Assignment created successfully with ID:', assignmentId);
      Alert.alert('Success', `Donation assigned to ${classInfo.className}! Request sent to donor.`);
      setShowClassModal(false);
      setSelectedDonation(null);
      await loadData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to create assignment: ${message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const getAssignmentStatus = (donationId: string) => {
    const donationAssignments = Object.values(assignments).filter(
      (a) => a.publishedDonationId === donationId
    );

    if (donationAssignments.length === 0) return null;

    const pending = donationAssignments.filter((a) => a.status === 'pending').length;
    const accepted = donationAssignments.filter((a) => a.status === 'accepted').length;
    const dispatched = donationAssignments.filter((a) => a.status === 'dispatched').length;
    const claimed = donationAssignments.filter((a) => a.status === 'claimed').length;
    const served = donationAssignments.filter((a) => a.status === 'served').length;

    return { pending, accepted, dispatched, claimed, served, total: donationAssignments.length };
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
        <Package size={48} color={theme.colors.surface} strokeWidth={2} />
        <Text style={styles.headerTitle}>Assign Food Donations</Text>
        <Text style={styles.headerSubtitle}>Assign donations to classes</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {Object.keys(donations).length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={64} color={theme.colors.text.light} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No food donations available</Text>
            <Text style={styles.emptySubtext}>Check back later</Text>
          </View>
        ) : (
          Object.entries(donations)
            .sort(([, a], [, b]) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(([id, donation]) => {
              const assignmentStatus = getAssignmentStatus(id);
              return (
                <View key={id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>FOOD</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>Available</Text>
                    </View>
                  </View>

                  <Text style={styles.itemName}>{donation.itemName}</Text>

                  <Text style={styles.quantityText}>
                    {donation.quantity} {donation.unit}
                  </Text>

                  <View style={styles.studentsInfo}>
                    <Users size={18} color={theme.colors.primary} />
                    <Text style={styles.studentsInfoText}>
                      {donation.remainingStudents ?? donation.numberOfStudents} students available
                      {donation.remainingStudents !== donation.numberOfStudents &&
                        ` (${donation.numberOfStudents} total)`}
                    </Text>
                  </View>

                  <Text style={styles.description} numberOfLines={2}>
                    {donation.description}
                  </Text>

                  <View style={styles.infoRow}>
                    <User size={16} color={theme.colors.text.light} />
                    <Text style={styles.infoText}>{donation.donorName}</Text>
                  </View>

                  {donation.location && (
                    <View style={styles.infoRow}>
                      <MapPin size={16} color={theme.colors.text.light} />
                      <Text style={styles.infoText}>{donation.location}</Text>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    <Calendar size={16} color={theme.colors.text.light} />
                    <Text style={styles.infoText}>
                      Available from {new Date(donation.availableFrom).toLocaleDateString()}
                    </Text>
                  </View>

                  {assignmentStatus && (
                    <View style={styles.assignmentStatus}>
                      <Text style={styles.assignmentStatusTitle}>Your Requests:</Text>
                      <View style={styles.statusRow}>
                        {assignmentStatus.pending > 0 && (
                          <Text style={styles.statusPending}>{assignmentStatus.pending} Pending</Text>
                        )}
                        {assignmentStatus.accepted > 0 && (
                          <Text style={styles.statusAccepted}>{assignmentStatus.accepted} Accepted</Text>
                        )}
                        {assignmentStatus.dispatched > 0 && (
                          <Text style={styles.statusDispatched}>{assignmentStatus.dispatched} Dispatched</Text>
                        )}
                        {assignmentStatus.claimed > 0 && (
                          <Text style={styles.statusClaimed}>{assignmentStatus.claimed} Claimed</Text>
                        )}
                        {assignmentStatus.served > 0 && (
                          <Text style={styles.statusServed}>{assignmentStatus.served} Served</Text>
                        )}
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.assignButton}
                    onPress={() => handleAssignDonation(id, donation)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[theme.colors.primary, theme.colors.accent]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.assignButtonGradient}
                    >
                      <Users size={20} color={theme.colors.surface} />
                      <Text style={styles.assignButtonText}>Assign to Class</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              );
            })
        )}
      </ScrollView>

      <Modal visible={showClassModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Class</Text>
              <TouchableOpacity onPress={() => setShowClassModal(false)}>
                <X color="#333" size={24} />
              </TouchableOpacity>
            </View>

            {selectedDonation && (
              <View style={styles.donationInfoBox}>
                <Text style={styles.donationInfoTitle}>{selectedDonation.donation.itemName}</Text>
                <Text style={styles.donationInfoDetail}>
                  {selectedDonation.donation.quantity} {selectedDonation.donation.unit}
                </Text>
                <Text style={styles.donationInfoRemaining}>
                  Available: {selectedDonation.donation.remainingStudents ?? selectedDonation.donation.numberOfStudents} students
                </Text>
              </View>
            )}

            <ScrollView style={styles.classListContainer}>
              {Object.keys(classes).length === 0 ? (
                <View style={styles.emptyClassState}>
                  <Text style={styles.emptyClassText}>No classes available</Text>
                  <Text style={styles.emptyClassSubtext}>Create classes first</Text>
                </View>
              ) : (
                Object.entries(classes).map(([classId, classInfo]) => (
                  <TouchableOpacity
                    key={classId}
                    style={[styles.classCard, isAssigning && styles.classCardDisabled]}
                    onPress={() => handleAssignToClass(classId, classInfo)}
                    activeOpacity={0.7}
                    disabled={isAssigning}
                  >
                    <View style={styles.classCardContent}>
                      <Text style={styles.classCardName}>{classInfo.className}</Text>
                      <Text style={styles.classCardGrade}>Grade {classInfo.grade}</Text>
                      <View style={styles.classCardStudents}>
                        <Users size={16} color={theme.colors.primary} />
                        <Text style={styles.classCardStudentsText}>
                          {classInfo.numberOfStudents} students
                        </Text>
                      </View>
                      {classInfo.teacherName && (
                        <Text style={styles.classCardTeacher}>Teacher: {classInfo.teacherName}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <PrincipalBottomNav />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.success,
  },
  itemName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  quantityText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  studentsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  studentsInfoText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
  },
  assignmentStatus: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  assignmentStatusTitle: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusPending: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusAccepted: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusDispatched: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#3B82F6',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusClaimed: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#8B5CF6',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusServed: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  assignButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
    ...theme.shadows.md,
  },
  assignButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  assignButtonText: {
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
  donationInfoBox: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  donationInfoTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  donationInfoDetail: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  donationInfoRemaining: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: theme.colors.primary,
    marginTop: 4,
  },
  classListContainer: {
    maxHeight: 400,
  },
  emptyClassState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyClassText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.secondary,
  },
  emptyClassSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.light,
    marginTop: 4,
  },
  classCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  classCardDisabled: {
    opacity: 0.5,
  },
  classCardContent: {},
  classCardName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  classCardGrade: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginBottom: 6,
  },
  classCardStudents: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  classCardStudentsText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
  },
  classCardTeacher: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.light,
  },
});
