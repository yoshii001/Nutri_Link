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
import { Package, Users, CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getTeacherByUserId } from '@/services/firebase/teacherService';
import {
  listenToReadyDonationsBySchool,
  ReadyDonation,
  deleteReadyDonation,
} from '@/services/firebase/readyDonationService';
import { getClassById, getClassesBySchoolId } from '@/services/firebase/classService';
import { addMealToClassStock } from '@/services/firebase/mealStockService';
import { getSchoolById } from '@/services/firebase/schoolService';
import { theme } from '@/constants/theme';
import TeacherHeader from '@/components/TeacherHeader';
import TeacherBottomNav from '@/components/TeacherBottomNav';

export default function ClaimMealScreen() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [teacherId, setTeacherId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');
  const [className, setClassName] = useState('');
  const [donations, setDonations] = useState<Record<string, ReadyDonation>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const teacherData = await getTeacherByUserId(user.uid);
        if (!teacherData) {
          Alert.alert('Error', 'Teacher profile not found');
          setLoading(false);
          return;
        }

        setTeacherId(teacherData.id);
        setSchoolId(teacherData.teacher.schoolId);

        // Find the class where this teacher is assigned
        const allClasses = await getClassesBySchoolId(teacherData.teacher.schoolId);
        let assignedClass = null;
        let assignedClassId = '';

        for (const [id, classInfo] of Object.entries(allClasses)) {
          if (classInfo.teacherId === teacherData.id) {
            assignedClass = classInfo;
            assignedClassId = id;
            break;
          }
        }

        setClassId(assignedClassId);
        if (assignedClass) {
          setClassName(assignedClass.className);
        }

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
            setLoading(false);
          }
        );

        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
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
      console.log('No classId assigned');
      Alert.alert('Error', 'You are not assigned to a class. Please contact your principal.');
      return;
    }

    console.log('Checking if donation classId matches', { donationClassId: donation.classId, myClassId: classId });

    if (donation.classId !== classId) {
      Alert.alert(
        'Different Class',
        `This donation is assigned to ${donation.className || 'another class'}, but you teach ${className}. Do you still want to claim it?`,
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
    if (!user || !userData) {
      console.log('performClaim: user or userData missing', { user: !!user, userData: !!userData });
      return;
    }

    console.log('performClaim called', { donationId, schoolId, classId });

    Alert.alert('Claim Donation', 'Claim this donation for your class?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Claim',
        onPress: async () => {
          try {
            console.log('Claim confirmed, starting process...');
            const donation = donations[donationId];
            if (!donation) {
              console.log('Donation not found in state');
              Alert.alert('Error', 'Donation not found');
              return;
            }

            console.log('Donation found:', donation);

            const dateId = new Date().toISOString().split('T')[0];
            const mealId = `${dateId}_${donationId}`;

            console.log('Adding meal to stock:', { schoolId, classId, mealId });

            await addMealToClassStock(schoolId, classId, mealId, {
              mealName: donation.itemName || 'Meal',
              quantity: donation.quantity || 0,
              coverage: donation.numberOfStudents,
              unit: donation.unit || 'servings',
              claimedAt: new Date().toISOString(),
              claimedBy: userData.name,
              donorName: donation.donorName,
              description: donation.description,
            });

            console.log('Meal added to stock, now deleting ready donation...');
            await deleteReadyDonation(donationId);
            console.log('Ready donation deleted, claim complete!');

            Alert.alert('Success', 'Meal claimed and added to your class stock!');
          } catch (error) {
            console.error('Error claiming donation:', error);
            Alert.alert('Error', 'Failed to claim donation: ' + (error as Error).message);
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
      <TeacherHeader title="Claim Meals" subtitle="Available donations for your class" />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!classId && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>No Class Assigned</Text>
            <Text style={styles.warningText}>
              You need to be assigned to a class to claim donations. Please contact your principal.
            </Text>
          </View>
        )}

        {classId && (
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Your Class</Text>
            <Text style={styles.infoValue}>{className || 'Loading...'}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading donations...</Text>
          </View>
        ) : sortedDonations.length === 0 ? (
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
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {(donation.category || 'DONATION').toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                    <Text style={[styles.statusText, { color: statusColors.text }]}>
                      {donation.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.itemName}>{donation.itemName || 'Donation'}</Text>
                {donation.description && (
                  <Text style={styles.description}>{donation.description}</Text>
                )}

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
                  <Text style={styles.detailLabel}>Assigned Class:</Text>
                  <Text style={styles.detailValue}>
                    {donation.className || 'No class assigned'}
                    {isMyClass && donation.className && donation.className !== 'No class assigned' && (
                      <Text style={styles.myClassTag}> (Your Class)</Text>
                    )}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Donor:</Text>
                  <Text style={styles.detailValue}>{donation.donorName}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>School:</Text>
                  <Text style={styles.detailValue}>{donation.schoolName || 'Loading...'}</Text>
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

                {canClaim && classId && (
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
                      <Text style={styles.claimButtonText}>Claim for My Class</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {isClaimed && (
                  <View style={[styles.completedBox, { backgroundColor: '#D1FAE5' }]}>
                    <CheckCircle size={20} color="#059669" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.completedText, { color: '#059669' }]}>
                        {isMyDonation ? 'You claimed this donation' : 'Claimed by another teacher'}
                      </Text>
                      {donation.completedAt && (
                        <Text style={[styles.completedSubtext, { color: '#059669' }]}>
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
    padding: theme.spacing.md,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  warningTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.primary,
    marginTop: 4,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  loadingText: {
    fontSize: 16,
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
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
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
    flex: 1,
    textAlign: 'right',
  },
  myClassTag: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
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
  completedBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  completedText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  completedSubtext: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
  },
});
