import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getSchoolByPrincipalId } from '@/services/firebase/schoolService';
import { getAllPublishedDonations } from '@/services/firebase/publishedDonationService';
import { getAllMoneyDonations, updateMoneyDonation, MoneyDonationRecord } from '@/services/firebase/moneyDonationService';
import { getClassesBySchoolId } from '@/services/firebase/classService';
import { createReadyDonation } from '@/services/firebase/readyDonationService';
import { PublishedDonation, ClassInfo } from '@/types';
import { Package, MapPin, Calendar, Users, X, DollarSign, CheckCircle } from 'lucide-react-native';
import PrincipalHeader from '@/components/PrincipalHeader';
import PrincipalBottomNav from '@/components/PrincipalBottomNav';

export default function DonorListScreen() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [donations, setDonations] = useState<Record<string, PublishedDonation>>({});
  const [moneyDonations, setMoneyDonations] = useState<Record<string, MoneyDonationRecord>>({});
  const [classes, setClasses] = useState<Record<string, ClassInfo>>({});
  const [schoolId, setSchoolId] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'food' | 'money'>('food');
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<{
    id: string;
    donation: PublishedDonation;
  } | null>(null);
  const [selectedMoneyDonation, setSelectedMoneyDonation] = useState<{
    id: string;
    donation: MoneyDonationRecord;
  } | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [studentsToAssign, setStudentsToAssign] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;

    try {
      const schoolData = await getSchoolByPrincipalId(user.uid);

      if (!schoolData) {
        return;
      }

  setSchoolId(schoolData.id);
  // schoolData.school may contain the school object; prefer its name
  setSchoolName(schoolData.school?.name || '');

      const [donationsData, moneyDonationsData, classesData] = await Promise.all([
        getAllPublishedDonations(),
        getAllMoneyDonations(),
        getClassesBySchoolId(schoolData.id),
      ]);

      // Filter for available food donations only (not completed)
      const availableDonations: Record<string, PublishedDonation> = {};
      Object.entries(donationsData).forEach(([id, donation]) => {
        if (
          donation.status === 'available' &&
          donation.category !== 'monetary' &&
          (donation.remainingStudents ?? donation.numberOfStudents ?? 0) > 0
        ) {
          availableDonations[id] = donation;
        }
      });

      // Filter for available money donations only (not accepted/completed)
      const availableMoneyDonations: Record<string, MoneyDonationRecord> = {};
      Object.entries(moneyDonationsData).forEach(([id, moneyDonation]) => {
        if (!moneyDonation.acceptedBy) {
          availableMoneyDonations[id] = moneyDonation;
        }
      });

      setDonations(availableDonations);
      setMoneyDonations(availableMoneyDonations);
      setClasses(classesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAssignClass = (donationId: string, donation: PublishedDonation) => {
    setSelectedDonation({ id: donationId, donation });
    setSelectedMoneyDonation(null);
    setAssignModalVisible(true);
    setSelectedClassId('');
    setStudentsToAssign('');
  };

  const handleAcceptMoneyDonation = async (donationId: string, donation: MoneyDonationRecord) => {
    if (!user || !userData) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    Alert.alert(
      'Accept Monetary Donation',
      `Accept $${donation.amount} from ${donation.donorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await updateMoneyDonation(donationId, {
                acceptedBy: user.uid,
                acceptedByName: userData.name,
                acceptedBySchool: schoolName,
                acceptedBySchoolId: schoolId,
                acceptedAt: new Date().toISOString(),
                status: 'accepted',
              });

              Alert.alert('Success', 'Monetary donation accepted successfully!');
              await loadData();
            } catch (error) {
              console.error('Error accepting money donation:', error);
              Alert.alert('Error', 'Failed to accept donation. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleConfirmAssignment = async () => {
    if (!selectedDonation || !selectedClassId || !studentsToAssign) {
      Alert.alert('Error', 'Please select a class and enter number of students');
      return;
    }

    const numberOfStudents = parseInt(studentsToAssign, 10);

    if (isNaN(numberOfStudents) || numberOfStudents <= 0) {
      Alert.alert('Error', 'Please enter a valid number of students');
      return;
    }

    const selectedClass = classes[selectedClassId];
    if (!selectedClass) {
      Alert.alert('Error', 'Selected class not found');
      return;
    }

    const remainingStudents =
      selectedDonation.donation.remainingStudents ??
      selectedDonation.donation.numberOfStudents ??
      0;

    if (numberOfStudents > remainingStudents) {
      Alert.alert(
        'Error',
        `Only ${remainingStudents} students remaining for this donation`
      );
      return;
    }

    if (numberOfStudents > selectedClass.numberOfStudents) {
      Alert.alert(
        'Warning',
        `This class only has ${selectedClass.numberOfStudents} students. Do you want to continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => sendRequestToDonor(numberOfStudents, selectedClass) },
        ]
      );
      return;
    }

    await sendRequestToDonor(numberOfStudents, selectedClass);
  };

  const sendRequestToDonor = async (numberOfStudents: number, selectedClass: ClassInfo) => {
    if (!selectedDonation || !user) return;

    try {
      await createReadyDonation({
        publishedDonationId: selectedDonation.id,
        donorId: selectedDonation.donation.donorId,
        donorName: selectedDonation.donation.donorName,
        principalId: user.uid,
        principalName: user.displayName || 'Principal',
        schoolId: schoolId,
        schoolName: schoolName,
        classId: selectedClassId,
        className: selectedClass.className,
        itemName: selectedDonation.donation.itemName,
        description: selectedDonation.donation.description,
        quantity: numberOfStudents,
        unit: selectedDonation.donation.unit,
        category: selectedDonation.donation.category,
        location: selectedDonation.donation.location,
        numberOfStudents: numberOfStudents,
      });

      Alert.alert('Success', 'Request sent for approval!');
      setAssignModalVisible(false);
      setSelectedDonation(null);
      setSelectedClassId('');
      setStudentsToAssign('');
      await loadData();
    } catch (error: any) {
      console.error('Error sending request:', error);
      Alert.alert('Error', error.message || 'Failed to send request');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PrincipalHeader title="Published Donations" showBack={true} />
        <Text style={styles.loadingText}>Loading...</Text>
        <PrincipalBottomNav />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PrincipalHeader title="Published Donations" showBack={true} />

      {/* Tab selector for Food and Money */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'food' && styles.tabActive]}
          onPress={() => setActiveTab('food')}
        >
          <Package size={20} color={activeTab === 'food' ? '#007AFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'food' && styles.tabTextActive]}>
            Food Donations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'money' && styles.tabActive]}
          onPress={() => setActiveTab('money')}
        >
          <DollarSign size={20} color={activeTab === 'money' ? '#007AFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'money' && styles.tabTextActive]}>
            Money Donations
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'food' ? (
          Object.keys(donations).length === 0 ? (
            <View style={styles.emptyState}>
              <Package color="#999" size={64} />
              <Text style={styles.emptyText}>No food donations available</Text>
            </View>
          ) : (
            <View style={styles.donationsContainer}>
              {Object.entries(donations).map(([id, donation]) => {
                const remainingStudents =
                  donation.remainingStudents ?? donation.numberOfStudents ?? 0;

                return (
                  <View key={id} style={styles.donationCard}>
                    <View style={styles.donationHeader}>
                      <View style={styles.donorInfo}>
                        <Text style={styles.donorName}>{donation.donorName}</Text>
                        <Text style={styles.donorEmail}>{donation.donorEmail}</Text>
                      </View>
                      <View
                        style={[
                          styles.categoryBadge,
                          donation.category === 'food' && styles.foodBadge,
                          donation.category === 'supplies' && styles.suppliesBadge,
                        ]}
                      >
                        <Text style={styles.categoryText}>{donation.category}</Text>
                      </View>
                    </View>

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{donation.itemName}</Text>
                      <Text style={styles.itemDescription}>{donation.description}</Text>
                      <Text style={styles.itemQuantity}>
                        Quantity: {donation.quantity} {donation.unit}
                      </Text>
                    </View>

                    <View style={styles.detailsRow}>
                      <View style={styles.detailItem}>
                        <Users color="#666" size={16} />
                        <Text style={styles.detailText}>
                          {remainingStudents} students available
                        </Text>
                      </View>
                    </View>

                    {donation.location && (
                      <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                          <MapPin color="#666" size={16} />
                          <Text style={styles.detailText}>{donation.location}</Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.detailsRow}>
                      <View style={styles.detailItem}>
                        <Calendar color="#666" size={16} />
                        <Text style={styles.detailText}>
                          Available from: {new Date(donation.availableFrom).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>

                    {donation.expiryDate && (
                      <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                          <Calendar color="#FF6B6B" size={16} />
                          <Text style={[styles.detailText, styles.expiryText]}>
                            Expires: {new Date(donation.expiryDate).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    )}

                    {donation.monetaryValue && (
                      <View style={styles.monetaryValue}>
                        <Text style={styles.monetaryLabel}>Monetary Value:</Text>
                        <Text style={styles.monetaryAmount}>${donation.monetaryValue}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.assignButton}
                      onPress={() => handleAssignClass(id, donation)}
                    >
                      <Text style={styles.assignButtonText}>Request for Class</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )
        ) : (
          /* Money Donations Tab */
          Object.keys(moneyDonations).length === 0 ? (
            <View style={styles.emptyState}>
              <DollarSign color="#999" size={64} />
              <Text style={styles.emptyText}>No monetary donations available</Text>
            </View>
          ) : (
            <View style={styles.donationsContainer}>
              {Object.entries(moneyDonations)
                .sort(([, a], [, b]) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
                .map(([id, moneyDonation]) => (
                  <View key={id} style={styles.donationCard}>
                    <View style={styles.donationHeader}>
                      <View style={styles.donorInfo}>
                        <Text style={styles.donorName}>{moneyDonation.donorName}</Text>
                        <Text style={styles.donorEmail}>{moneyDonation.donorEmail}</Text>
                      </View>
                      <View style={styles.monetaryBadge}>
                        <DollarSign size={16} color="#FF9500" />
                        <Text style={styles.categoryText}>Money</Text>
                      </View>
                    </View>

                    <View style={styles.moneyAmountContainer}>
                      <Text style={styles.moneyAmount}>${moneyDonation.amount}</Text>
                      <Text style={styles.moneyLabel}>Available Amount</Text>
                    </View>

                    {moneyDonation.note && (
                      <View style={styles.itemInfo}>
                        <Text style={styles.noteLabel}>Note:</Text>
                        <Text style={styles.itemDescription}>{moneyDonation.note}</Text>
                      </View>
                    )}

                    <View style={styles.detailsRow}>
                      <View style={styles.detailItem}>
                        <Calendar color="#666" size={16} />
                        <Text style={styles.detailText}>
                          Available from: {new Date(moneyDonation.availableFrom || moneyDonation.createdAt || '').toLocaleDateString()}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAcceptMoneyDonation(id, moneyDonation)}
                    >
                      <CheckCircle size={20} color="#fff" />
                      <Text style={styles.acceptButtonText}>Accept Donation</Text>
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          )
        )}
      </ScrollView>

      <Modal
        visible={assignModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Donation for Class</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <X color="#333" size={24} />
              </TouchableOpacity>
            </View>

            {selectedDonation && (
              <View style={styles.selectedDonationInfo}>
                <Text style={styles.modalLabel}>Donation:</Text>
                <Text style={styles.modalValue}>{selectedDonation.donation.itemName}</Text>
                <Text style={styles.modalSubtext}>
                  Available: {selectedDonation.donation.remainingStudents ?? selectedDonation.donation.numberOfStudents ?? 0} students
                </Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Select Class</Text>
              <ScrollView style={styles.classListScroll}>
                {Object.entries(classes).map(([classId, classInfo]) => (
                  <TouchableOpacity
                    key={classId}
                    style={[
                      styles.classOption,
                      selectedClassId === classId && styles.classOptionSelected,
                    ]}
                    onPress={() => setSelectedClassId(classId)}
                  >
                    <View style={styles.classOptionContent}>
                      <Text style={styles.classOptionName}>{classInfo.className}</Text>
                      <Text style={styles.classOptionDetails}>
                        Grade: {classInfo.grade} | Students: {classInfo.numberOfStudents}
                      </Text>
                      {classInfo.teacherName && (
                        <Text style={styles.classOptionTeacher}>
                          Teacher: {classInfo.teacherName}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Number of Students</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter number of students"
                value={studentsToAssign}
                onChangeText={setStudentsToAssign}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAssignModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmAssignment}
              >
                <Text style={styles.confirmButtonText}>Send Request</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  donationsContainer: {
    padding: 16,
  },
  donationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  donationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  donorEmail: {
    fontSize: 14,
    color: '#666',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  foodBadge: {
    backgroundColor: '#E8F5E9',
  },
  suppliesBadge: {
    backgroundColor: '#E3F2FD',
  },
  monetaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    color: '#333',
  },
  itemInfo: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  moneyAmountContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 12,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
  },
  moneyAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FF9500',
    marginBottom: 4,
  },
  moneyLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailsRow: {
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  expiryText: {
    color: '#FF6B6B',
    fontWeight: '500',
  },
  monetaryValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  monetaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  monetaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF9500',
  },
  assignButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  assignButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  acceptButton: {
    flexDirection: 'row',
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  selectedDonationInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#007AFF',
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  classListScroll: {
    maxHeight: 200,
  },
  classOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  classOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  classOptionContent: {},
  classOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  classOptionDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  classOptionTeacher: {
    fontSize: 12,
    color: '#999',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    marginLeft: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
