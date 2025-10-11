import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getSchoolByPrincipalId } from '@/services/firebase/schoolService';
import {
  getClassesBySchoolId,
  createClass,
  assignTeacherToClass,
  listenToClasses
} from '@/services/firebase/classService';
import { getTeachersBySchoolId } from '@/services/firebase/teacherService';
import { getAllUsers } from '@/services/firebase/adminService';
import {
  createClassDonationRequest,
  listenToSchoolClassDonationRequests,
  rejectClassDonationRequest
} from '@/services/firebase/classDonationRequestService';
import { getStudentsByClassId } from '@/services/firebase/studentService';
import { ClassInfo, Teacher, User as UserProfile, ClassDonationRequest } from '@/types';
import { theme } from '@/constants/theme';
import { Plus, X, Users, User, DollarSign, CheckCircle, XCircle, ChevronDown } from 'lucide-react-native';
import PrincipalHeader from '@/components/PrincipalHeader';
import PrincipalBottomNav from '@/components/PrincipalBottomNav';

export default function ManageClassesScreen() {
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [classes, setClasses] = useState<Record<string, ClassInfo>>({});
  const [teachers, setTeachers] = useState<Record<string, Teacher>>({});
  const [donors, setDonors] = useState<Record<string, UserProfile>>({});
  const [donationRequests, setDonationRequests] = useState<Record<string, ClassDonationRequest>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);

  const [className, setClassName] = useState('');
  const [grade, setGrade] = useState('');
  const [numberOfStudents, setNumberOfStudents] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [requestPurpose, setRequestPurpose] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [requestAmount, setRequestAmount] = useState('');
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);

  const load = async () => {
    if (!user) return;

    try {
      const schoolData = await getSchoolByPrincipalId(user.uid);
      if (!schoolData) return;

      setSchoolId(schoolData.id);
      setSchoolName(schoolData.school.name);

      const [teachersData, allUsers] = await Promise.all([
        getTeachersBySchoolId(schoolData.id),
        getAllUsers(),
      ]);

      setTeachers(teachersData);

      const donorUsers: Record<string, UserProfile> = {};
      Object.entries(allUsers).forEach(([id, userData]) => {
        if (userData.role === 'donor') {
          donorUsers[id] = userData;
        }
      });
      setDonors(donorUsers);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    load();

    (async () => {
      const schoolData = await getSchoolByPrincipalId(user.uid);
      if (!schoolData) return;

      const unsubscribeClasses = listenToClasses(schoolData.id, (classesData) => {
        setClasses(classesData);
      });

      const unsubscribeRequests = listenToSchoolClassDonationRequests(
        schoolData.id,
        (requests) => {
          setDonationRequests(requests);
        }
      );

      return () => {
        unsubscribeClasses();
        unsubscribeRequests();
      };
    })();
  }, [user]);

  const handleAddClass = async () => {
    if (!className.trim() || !grade.trim() || !numberOfStudents.trim()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const classData: any = {
        className: className.trim(),
        grade: grade.trim(),
        numberOfStudents: parseInt(numberOfStudents, 10),
        schoolId,
      };

      if (selectedTeacherId) {
        const teacher = teachers[selectedTeacherId];
        if (teacher) {
          classData.teacherId = selectedTeacherId;
          classData.teacherName = teacher.name;
        }
      }

      await createClass(schoolId, classData);

      setClassName('');
      setGrade('');
      setNumberOfStudents('');
      setSelectedTeacherId('');
      setShowAddModal(false);
      await load();
      Alert.alert('Success', 'Class created successfully!');
    } catch (error) {
      console.error('Error creating class:', error);
      Alert.alert('Error', 'Failed to create class');
    }
  };

  const handleAssignTeacher = async (teacherId: string) => {
    const teacher = teachers[teacherId];
    if (!teacher) return;

    try {
      await assignTeacherToClass(schoolId, selectedClassId, teacherId, teacher.name);
      setShowAssignModal(false);
      await load();
      Alert.alert('Success', `${teacher.name} assigned successfully!`);
    } catch (error) {
      console.error('Error assigning teacher:', error);
      Alert.alert('Error', 'Failed to assign teacher');
    }
  };

  const openAssignModal = (classId: string) => {
    setSelectedClassId(classId);
    setShowAssignModal(true);
  };

  const openDonorModal = async (classId: string) => {
    const cls = classes[classId];
    if (!cls) return;

    try {
      const students = await getStudentsByClassId(classId);
      const actualStudentCount = Object.keys(students).length;

      setSelectedClassId(classId);
      setSelectedClass({ ...cls, numberOfStudents: actualStudentCount });
      setShowDonorModal(true);
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'Failed to load class students');
    }
  };

  const handleAssignDonor = async (donorId: string) => {
    if (!selectedClass || !user) return;

    const donor = donors[donorId];
    if (!donor) return;

    try {
      await createClassDonationRequest({
        classId: selectedClassId,
        className: selectedClass.className,
        schoolId: schoolId,
        schoolName: schoolName,
        principalId: user.uid,
        principalName: user.displayName || user.email || 'Principal',
        numberOfStudents: selectedClass.numberOfStudents,
        donorId: donorId,
        donorName: donor.name,
        requestedAmount: parseFloat(requestAmount) || undefined,
        purpose: requestPurpose.trim() || undefined,
        description: requestDescription.trim() || undefined,
      });

      setShowDonorModal(false);
      setRequestPurpose('');
      setRequestDescription('');
      setRequestAmount('');
      Alert.alert('Success', `Donation request sent to ${donor.name}`);
    } catch (error) {
      console.error('Error assigning donor:', error);
      Alert.alert('Error', 'Failed to send donation request');
    }
  };

  const handleReassignDonor = async (requestId: string, classId: string) => {
    try {
      await rejectClassDonationRequest(requestId);
      await openDonorModal(classId);
    } catch (error) {
      console.error('Error reassigning donor:', error);
      Alert.alert('Error', 'Failed to reassign donor');
    }
  };

  const getClassRequests = (classId: string) => {
    return Object.entries(donationRequests).filter(
      ([_, req]) => req.classId === classId
    );
  };

  const getClassRequestStatus = (classId: string) => {
    const requests = getClassRequests(classId);
    const pending = requests.filter(([_, req]) => req.status === 'pending');
    const approved = requests.filter(([_, req]) => req.status === 'approved');
    const rejected = requests.filter(([_, req]) => req.status === 'rejected');

    return { pending, approved, rejected, total: requests.length };
  };

  return (
    <View style={styles.container}>
      <PrincipalHeader title="Manage Classes" showBack={true} />

      <FlatList
        data={Object.entries(classes)}
        keyExtractor={([id]) => id}
        renderItem={({ item: [id, cls] }) => {
          const requestStatus = getClassRequestStatus(id);
          return (
            <View style={styles.classCard}>
              <View style={styles.classInfo}>
                <Text style={styles.className}>{cls.className}</Text>
                <Text style={styles.classDetail}>Grade: {cls.grade}</Text>
                <Text style={styles.classDetail}>Students: {cls.numberOfStudents}</Text>
                {cls.teacherName && (
                  <Text style={styles.teacherName}>Teacher: {cls.teacherName}</Text>
                )}
                {requestStatus.total > 0 && (
                  <View style={styles.statusRow}>
                    {requestStatus.pending.length > 0 && (
                      <Text style={styles.statusPending}>
                        {requestStatus.pending.length} Pending
                      </Text>
                    )}
                    {requestStatus.approved.length > 0 && (
                      <Text style={styles.statusApproved}>
                        {requestStatus.approved.length} Approved
                      </Text>
                    )}
                    {requestStatus.rejected.length > 0 && (
                      <Text style={styles.statusRejected}>
                        {requestStatus.rejected.length} Rejected
                      </Text>
                    )}
                  </View>
                )}
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.assignButton} onPress={() => openAssignModal(id)}>
                  <User color={theme.colors.primary} size={20} />
                  <Text style={styles.assignText}>Teacher</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.donorButton} onPress={() => openDonorModal(id)}>
                  <DollarSign color={theme.colors.success} size={20} />
                  <Text style={styles.donorText}>Donor</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Users color="#ccc" size={64} />
            <Text style={styles.emptyText}>No classes yet</Text>
            <TouchableOpacity style={styles.emptyAddButton} onPress={() => setShowAddModal(true)}>
              <Text style={styles.emptyAddText}>Create First Class</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity style={styles.floatingButton} onPress={() => setShowAddModal(true)}>
        <Plus color="#fff" size={28} />
      </TouchableOpacity>

      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Class</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X color="#333" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Class Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Class A, Morning Group"
                value={className}
                onChangeText={setClassName}
              />

              <Text style={styles.inputLabel}>Grade *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 1st, 2nd"
                value={grade}
                onChangeText={setGrade}
              />

              <Text style={styles.inputLabel}>Number of Students *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter number"
                value={numberOfStudents}
                onChangeText={setNumberOfStudents}
                keyboardType="number-pad"
              />

              <Text style={styles.inputLabel}>Assign Teacher (Optional)</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowTeacherPicker(!showTeacherPicker)}
              >
                <Text style={[styles.pickerText, !selectedTeacherId && styles.pickerPlaceholder]}>
                  {selectedTeacherId ? teachers[selectedTeacherId]?.name : 'Select a teacher'}
                </Text>
                <ChevronDown color="#666" size={20} />
              </TouchableOpacity>

              {showTeacherPicker && (
                <View style={styles.teacherPickerContainer}>
                  <TouchableOpacity
                    style={styles.teacherPickerItem}
                    onPress={() => {
                      setSelectedTeacherId('');
                      setShowTeacherPicker(false);
                    }}
                  >
                    <Text style={styles.teacherPickerItemText}>No teacher</Text>
                  </TouchableOpacity>
                  {Object.entries(teachers).map(([id, teacher]) => (
                    <TouchableOpacity
                      key={id}
                      style={styles.teacherPickerItem}
                      onPress={() => {
                        setSelectedTeacherId(id);
                        setShowTeacherPicker(false);
                      }}
                    >
                      <Text style={styles.teacherPickerItemName}>{teacher.name}</Text>
                      <Text style={styles.teacherPickerItemEmail}>{teacher.email}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.submitButton} onPress={handleAddClass}>
                <Text style={styles.submitButtonText}>Create Class</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showAssignModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Teacher</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <X color="#333" size={24} />
              </TouchableOpacity>
            </View>

            {Object.keys(teachers).length === 0 ? (
              <Text style={styles.emptyText}>No teachers available. Add teachers first from the Manage Teachers page.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {Object.entries(teachers).map(([id, teacher]) => (
                  <TouchableOpacity
                    key={id}
                    style={styles.teacherItem}
                    onPress={() => handleAssignTeacher(id)}
                  >
                    <Text style={styles.teacherItemName}>{teacher.name}</Text>
                    <Text style={styles.teacherItemEmail}>{teacher.email}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showDonorModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Donor to Class</Text>
              <TouchableOpacity onPress={() => setShowDonorModal(false)}>
                <X color="#333" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedClass && (
                <View style={styles.classInfoBox}>
                  <Text style={styles.classInfoTitle}>{selectedClass.className}</Text>
                  <Text style={styles.classInfoDetail}>
                    Grade: {selectedClass.grade} | Students: {selectedClass.numberOfStudents}
                  </Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Purpose</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Monthly meal support"
                value={requestPurpose}
                onChangeText={setRequestPurpose}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional details about the request"
                value={requestDescription}
                onChangeText={setRequestDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Requested Amount (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                value={requestAmount}
                onChangeText={setRequestAmount}
                keyboardType="decimal-pad"
              />

              <Text style={styles.sectionTitle}>Select Donor</Text>

              {Object.entries(donors).map(([id, donor]) => (
                <TouchableOpacity
                  key={id}
                  style={styles.donorItem}
                  onPress={() => handleAssignDonor(id)}
                >
                  <View style={styles.donorInfo}>
                    <Text style={styles.donorName}>{donor.name}</Text>
                    <Text style={styles.donorEmail}>{donor.email}</Text>
                  </View>
                  <DollarSign color={theme.colors.success} size={20} />
                </TouchableOpacity>
              ))}

              {Object.keys(donors).length === 0 && (
                <Text style={styles.emptyText}>No donors available</Text>
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
  floatingButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: theme.colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  emptyAddButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  emptyAddText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  classCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  classDetail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  teacherName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: theme.colors.primary,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  statusPending: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusApproved: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusRejected: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  assignButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  assignText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: theme.colors.primary,
  },
  donorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  donorText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#10B981',
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
  inputLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  submitButtonText: {
    color: theme.colors.text.inverse,
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  teacherItem: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  teacherItemName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  teacherItemEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  classInfoBox: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  classInfoTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  classInfoDetail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  donorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  donorEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  pickerPlaceholder: {
    color: theme.colors.text.secondary,
  },
  teacherPickerContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: 200,
  },
  teacherPickerItem: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  teacherPickerItemName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  teacherPickerItemEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  teacherPickerItemText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: theme.colors.text.secondary,
  },
});
