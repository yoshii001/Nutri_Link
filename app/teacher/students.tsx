import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Share,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getStudentsByTeacher,
  addStudent,
  deleteStudent,
  updateStudent,
  regenerateAccessCode,
} from '@/services/firebase/studentService';
import { getTeacherById, getTeacherByUserId } from '@/services/firebase/teacherService';
import { getClassesBySchoolId } from '@/services/firebase/classService';
import { StudentProfile, ClassInfo } from '@/types';
import { theme } from '@/constants/theme';
import { User, Trash2, Share2, Plus, X, Users, RefreshCw } from 'lucide-react-native';
import TeacherHeader from '@/components/TeacherHeader';
import TeacherBottomNav from '@/components/TeacherBottomNav';

export default function StudentsScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Record<string, StudentProfile>>({});
  const [classes, setClasses] = useState<Record<string, ClassInfo>>({});
  const [schoolId, setSchoolId] = useState('');
  const [query, setQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState('');
  const [grade, setGrade] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentContact, setParentContact] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [allergies, setAllergies] = useState('none');
  const [teacherClassId, setTeacherClassId] = useState('');
  const [teacherClass, setTeacherClass] = useState<ClassInfo | null>(null);

  const load = async () => {
    if (!user) return;
    try {
      const list = await getStudentsByTeacher(user.uid);
      setStudents(list || {});

      const teacherData = await getTeacherByUserId(user.uid);
      if (teacherData) {
        const { teacher } = teacherData;
        if (teacher.schoolId) {
          setSchoolId(teacher.schoolId);
          const classesData = await getClassesBySchoolId(teacher.schoolId);
          setClasses(classesData || {});

          if (teacher.classId) {
            setTeacherClassId(teacher.classId);
            const assignedClass = classesData[teacher.classId];
            if (assignedClass) {
              setTeacherClass(assignedClass);
              setGrade(assignedClass.grade || '');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }

    return calculatedAge;
  };

  const handleDOBChange = (dob: string) => {
    setDateOfBirth(dob);
    if (dob && /^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      const calculatedAge = calculateAge(dob);
      setAge(calculatedAge.toString());
    }
  };

  const handleAdd = async () => {
    if (
      !studentId.trim() ||
      !name.trim() ||
      !dateOfBirth.trim() ||
      !parentName.trim() ||
      !parentContact.trim()
    ) {
      Alert.alert('Missing fields', 'Please fill all required fields');
      return;
    }

    const calculatedAge = calculateAge(dateOfBirth.trim());
    const finalGrade = teacherClass ? teacherClass.grade : grade.trim();
    const finalClassId = teacherClassId || undefined;

    const payload: StudentProfile = {
      studentId: studentId.trim(),
      name: name.trim(),
      dateOfBirth: dateOfBirth.trim(),
      age: calculatedAge,
      grade: finalGrade,
      parentName: parentName.trim(),
      parentContact: parentContact.trim(),
      parentEmail: parentEmail.trim() || undefined,
      allergies: allergies.trim() || 'none',
      mealFeedbacks: undefined,
      classId: finalClassId,
    };

    try {
      await addStudent(user!.uid, payload);
      setStudentId('');
      setName('');
      setDateOfBirth('');
      setAge('');
      if (teacherClass) {
        setGrade(teacherClass.grade || '');
      } else {
        setGrade('');
      }
      setParentName('');
      setParentContact('');
      setParentEmail('');
      setAllergies('none');
      setShowAddModal(false);
      await load();
      Alert.alert('Success', `${payload.name} added successfully!`);
    } catch (err: any) {
      console.error('Failed to add student:', err);
      const message = err?.message || String(err) || 'Could not add student';
      Alert.alert('Error adding student', message);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Student', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteStudent(user!.uid, id);
          await load();
        },
      },
    ]);
  };

  const handleShareLink = async (student: StudentProfile, studentKey: string) => {
    try {
      const shareMessage = `🎓 Parent Portal Access for ${student.name}\n\n` +
        `Dear ${student.parentName},\n\n` +
        `You can now access your child's meal information using the Parent Portal.\n\n` +
        `📱 Access Code: ${student.parentAccessToken}\n\n` +
        `Instructions:\n` +
        `1. Open the app and tap "Parent Login"\n` +
        `2. Enter the 8-character access code exactly as shown\n` +
        `3. Code format: 7 capital letters + 1 symbol ($, @, #, or *)\n` +
        `4. Access your child's information\n\n` +
        `What you can do:\n` +
        `• View today's meal and donor information\n` +
        `• Update allergy information\n` +
        `• Provide meal feedback\n` +
        `• Rate donors who provide meals\n\n` +
        `Student: ${student.name}\n` +
        `Grade: ${student.grade}\n\n` +
        `Thank you for your participation!`;

      await Share.share({
        message: shareMessage,
        title: 'Parent Portal Access',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const openAssignModal = (studentId: string) => {
    setSelectedStudentId(studentId);
    setShowAssignModal(true);
  };

  const handleAssignToClass = async (classId: string) => {
    if (!user || !selectedStudentId) return;

    try {
      await updateStudent(user.uid, selectedStudentId, { classId });
      setShowAssignModal(false);
      await load();
      Alert.alert('Success', 'Student assigned to class');
    } catch (error) {
      console.error('Error assigning student:', error);
      Alert.alert('Error', 'Failed to assign student to class');
    }
  };

  const handleRegenerateCode = async (studentId: string, studentName: string) => {
    Alert.alert(
      'Regenerate Access Code',
      `Generate a new 8-character access code for ${studentName}?\n\nThis will invalidate the old code.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: async () => {
            try {
              const newCode = await regenerateAccessCode(user!.uid, studentId);
              await load();
              Alert.alert('Success', `New access code: ${newCode}\n\nShare this code with the parent.`);
            } catch (error) {
              console.error('Error regenerating code:', error);
              Alert.alert('Error', 'Failed to regenerate access code');
            }
          },
        },
      ]
    );
  };

  const filtered = Object.entries(students).filter(([id, s]) => {
    const q = query.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q) ||
      s.parentName.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <TeacherHeader title="My Students" />

      <View style={styles.addButtonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Plus color="#fff" size={20} />
          <Text style={styles.addButtonText}>Add Student</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID, or parent..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={([id]) => id}
        renderItem={({ item: [id, s] }) => {
          const studentClass = s.classId ? classes[s.classId] : null;
          return (
            <View style={styles.studentRow}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{s.name}</Text>
                <Text style={styles.studentDetail}>ID: {s.studentId} | Age: {s.age} | Grade: {s.grade}</Text>
                <Text style={styles.studentDetail}>
                  Parent: {s.parentName} ({s.parentContact})
                </Text>
                {s.parentAccessToken && (
                  <View style={styles.accessCodeBox}>
                    <Text style={styles.accessCodeLabel}>Parent Access Code:</Text>
                    <Text style={styles.accessCodeValue}>{s.parentAccessToken}</Text>
                    {s.parentAccessToken.length !== 8 && (
                      <Text style={styles.invalidCodeWarning}>Invalid format (should be 8 chars)</Text>
                    )}
                  </View>
                )}
                {s.allergies && s.allergies !== 'none' && (
                  <Text style={styles.allergyTag}>⚠️ Allergies: {s.allergies}</Text>
                )}
                {studentClass ? (
                  <Text style={styles.classInfo}>Class: {studentClass.className}</Text>
                ) : (
                  <Text style={styles.noClass}>No class assigned</Text>
                )}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => openAssignModal(id)}
                  style={styles.iconButton}
                >
                  <Users color={theme.colors.success} size={20} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRegenerateCode(id, s.name)} style={styles.iconButton}>
                  <RefreshCw color="#F59E0B" size={20} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleShareLink(s, id)} style={styles.iconButton}>
                  <Share2 color={theme.colors.primary} size={20} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(id)} style={styles.iconButton}>
                  <Trash2 color="#FF3B30" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <User color="#ccc" size={64} />
            <Text style={styles.emptyText}>
              {query ? 'No students found' : 'No students yet'}
            </Text>
          </View>
        }
      />

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Student</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X color="#333" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Student ID (Reg No) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter student registration number"
                value={studentId}
                onChangeText={setStudentId}
              />

              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter student name"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Date of Birth *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={dateOfBirth}
                onChangeText={handleDOBChange}
              />

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Age (Auto-calculated)</Text>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    placeholder="Auto-calculated"
                    value={age}
                    editable={false}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Grade {teacherClass && '(Auto-filled)'}</Text>
                  <TextInput
                    style={[styles.input, teacherClass && styles.inputDisabled]}
                    placeholder="Grade"
                    value={grade}
                    onChangeText={setGrade}
                    editable={!teacherClass}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Parent Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter parent name"
                value={parentName}
                onChangeText={setParentName}
              />

              <Text style={styles.inputLabel}>Parent Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                value={parentContact}
                onChangeText={setParentContact}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Parent Email (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter parent email"
                value={parentEmail}
                onChangeText={setParentEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Allergies</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter allergies or 'none'"
                value={allergies}
                onChangeText={setAllergies}
                multiline
              />

              {teacherClass && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    Student will be automatically assigned to: {teacherClass.className}
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
                <Text style={styles.submitButtonText}>Add Student</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showAssignModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign to Class</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <X color="#333" size={24} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={Object.entries(classes)}
              keyExtractor={([id]) => id}
              renderItem={({ item: [id, cls] }) => (
                <TouchableOpacity
                  style={styles.classItem}
                  onPress={() => handleAssignToClass(id)}
                >
                  <View style={styles.classItemInfo}>
                    <Text style={styles.classItemName}>{cls.className}</Text>
                    <Text style={styles.classItemDetail}>
                      Grade: {cls.grade} | Students: {cls.numberOfStudents}
                    </Text>
                    {cls.teacherName && (
                      <Text style={styles.classItemTeacher}>Teacher: {cls.teacherName}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No classes available</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      <TeacherBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  addButtonContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  addButtonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
  },
  searchContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  searchInput: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  studentDetail: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  classInfo: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: theme.colors.primary,
    marginTop: 4,
  },
  accessCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.xs,
    marginTop: 4,
    alignSelf: 'flex-start',
    flexWrap: 'wrap',
  },
  accessCodeLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  accessCodeValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: theme.colors.primary,
    letterSpacing: 2,
  },
  invalidCodeWarning: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  allergyTag: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  noClass: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#F59E0B',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  iconButton: {
    padding: theme.spacing.sm,
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
    maxHeight: '90%',
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
  inputRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
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
  classItem: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  classItemInfo: {
    flex: 1,
  },
  classItemName: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  classItemDetail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  classItemTeacher: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: theme.colors.primary,
    marginTop: 4,
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: theme.colors.text.secondary,
  },
  infoBox: {
    backgroundColor: '#E0F2FE',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#0369A1',
  },
});
