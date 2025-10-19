import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getAllTeachers,
  updateTeacher,
  deactivateTeacher,
  deleteTeacher,
} from '@/services/firebase/teacherService';
import { getAllSchools } from '@/services/firebase/schoolService';
import { deleteUser } from '@/services/firebase/adminService';
import { Teacher, School } from '@/types';
import { X, Plus, CreditCard as Edit2, Trash2, Users, ChevronLeft, Check, Power } from 'lucide-react-native';

export default function AdminTeachersScreen() {
  const router = useRouter();
  const { userData } = useAuth();
  const { t } = useLanguage();
  const [teachers, setTeachers] = useState<Record<string, Teacher & { id: string }>>({});
  const [schools, setSchools] = useState<Record<string, School>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    schoolId: '',
    classId: '',
    className: '',
    isActive: true,
  });

  const loadData = async () => {
    try {
      const [teachersData, schoolsData] = await Promise.all([
        getAllTeachers(),
        getAllSchools(),
      ]);

      // Add IDs to teachers
      const teachersWithIds: Record<string, Teacher & { id: string }> = {};
      Object.entries(teachersData).forEach(([id, teacher]) => {
        teachersWithIds[id] = { ...teacher, id };
      });

      setTeachers(teachersWithIds);
      setSchools(schoolsData);
    } catch (error) {
      console.error('Error loading teachers:', error);
      Alert.alert(t('common.error'), 'Failed to load teachers');
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

  const handleOpenModal = (teacher?: Teacher & { id: string }) => {
    if (teacher) {
      setEditingTeacherId(teacher.id);
      setFormData({
        name: teacher.name,
        email: teacher.email,
        schoolId: teacher.schoolId,
        classId: teacher.classId || '',
        className: teacher.className || '',
        isActive: teacher.isActive,
      });
    } else {
      setEditingTeacherId(null);
      setFormData({
        name: '',
        email: '',
        schoolId: '',
        classId: '',
        className: '',
        isActive: true,
      });
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingTeacherId(null);
  };

  const handleSaveTeacher = async () => {
    if (!formData.name || !formData.email || !formData.schoolId) {
      Alert.alert(t('common.error'), 'Please fill in all required fields');
      return;
    }

    try {
      if (editingTeacherId) {
        // Update existing teacher
        await updateTeacher(editingTeacherId, {
          name: formData.name,
          schoolId: formData.schoolId,
          classId: formData.classId || undefined,
          className: formData.className || undefined,
          isActive: formData.isActive,
        });
        Alert.alert(t('common.success'), 'Teacher updated successfully');
      }
      handleCloseModal();
      loadData();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Failed to save teacher');
    }
  };

  const handleDeactivateTeacher = (teacherId: string, teacherName: string) => {
    Alert.alert(
      'Deactivate Teacher',
      `Are you sure you want to deactivate ${teacherName}? They will no longer be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateTeacher(teacherId);
              Alert.alert(t('common.success'), 'Teacher deactivated successfully');
              loadData();
            } catch (error) {
              Alert.alert(t('common.error'), 'Failed to deactivate teacher');
            }
          },
        },
      ]
    );
  };

  const handleDeleteTeacher = (teacherId: string, teacherName: string, userId?: string) => {
    Alert.alert(
      'Delete Teacher',
      `Are you sure you want to permanently delete ${teacherName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the teacher record first
              await deleteTeacher(teacherId);
              // Then delete the user account if userId exists
              if (userId) {
                await deleteUser(userId);
              }
              Alert.alert(t('common.success'), 'Teacher deleted successfully');
              loadData();
            } catch (error) {
              Alert.alert(t('common.error'), 'Failed to delete teacher');
            }
          },
        },
      ]
    );
  };

  const getSchoolName = (schoolId: string) => {
    return schools[schoolId]?.name || 'Unknown School';
  };

  if (userData?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t('admin.accessDenied')}</Text>
      </View>
    );
  }

  const activeTeachers = Object.values(teachers).filter((t) => t.isActive).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Teacher Management</Text>
          <Text style={styles.headerSubtitle}>
            {activeTeachers} active out of {Object.keys(teachers).length} teachers
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {Object.entries(teachers).length === 0 ? (
          <View style={styles.emptyState}>
            <Users color="#999" size={48} />
            <Text style={styles.emptyText}>No teachers found</Text>
          </View>
        ) : (
          Object.entries(teachers).map(([_, teacher]) => (
            <View key={teacher.id} style={styles.teacherCard}>
              <View style={styles.teacherInfo}>
                <View style={styles.teacherHeader}>
                  <View style={styles.teacherNameContainer}>
                    <Text style={styles.teacherName}>{teacher.name}</Text>
                    {!teacher.isActive && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={styles.teacherEmail}>{teacher.email}</Text>
                <Text style={styles.teacherSchool}>
                  📍 {getSchoolName(teacher.schoolId)}
                </Text>
                {teacher.className && (
                  <Text style={styles.teacherClass}>📚 Class: {teacher.className}</Text>
                )}
              </View>
              <View style={styles.teacherActions}>
                <TouchableOpacity
                  onPress={() => handleOpenModal(teacher)}
                  style={styles.iconButton}
                >
                  <Edit2 color="#007AFF" size={20} />
                </TouchableOpacity>
                {teacher.isActive && (
                  <TouchableOpacity
                    onPress={() => handleDeactivateTeacher(teacher.id, teacher.name)}
                    style={styles.iconButton}
                  >
                    <Power color="#FF9800" size={20} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() =>
                    handleDeleteTeacher(teacher.id, teacher.name, teacher.userId)
                  }
                  style={styles.iconButton}
                >
                  <Trash2 color="#f44336" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTeacherId ? 'Edit Teacher' : 'Add New Teacher'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X color="#666" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Teacher name"
              />

              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={[styles.input, !editingTeacherId && styles.input]}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="teacher@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={false}
              />

              <Text style={styles.label}>School *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.schoolSelector}
              >
                {Object.entries(schools).map(([schoolId, school]) => (
                  <TouchableOpacity
                    key={schoolId}
                    style={[
                      styles.schoolOption,
                      formData.schoolId === schoolId && styles.schoolOptionActive,
                    ]}
                    onPress={() => setFormData({ ...formData, schoolId })}
                  >
                    <Text
                      style={[
                        styles.schoolOptionText,
                        formData.schoolId === schoolId &&
                          styles.schoolOptionTextActive,
                      ]}
                    >
                      {school.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Class Name (Optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.className}
                onChangeText={(text) => setFormData({ ...formData, className: text })}
                placeholder="e.g., Class A, Grade 5"
              />

              <Text style={styles.label}>Class ID (Optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.classId}
                onChangeText={(text) => setFormData({ ...formData, classId: text })}
                placeholder="class-id"
              />

              <View style={styles.statusSection}>
                <View style={styles.statusToggle}>
                  <Text style={styles.statusLabel}>Active Status</Text>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      formData.isActive && styles.toggleButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, isActive: !formData.isActive })
                    }
                  >
                    {formData.isActive ? (
                      <Check color="#fff" size={20} />
                    ) : (
                      <Power color="#fff" size={20} />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.statusText}>
                  {formData.isActive
                    ? 'Teacher can access the system'
                    : 'Teacher cannot access the system'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSaveTeacher}
              >
                <Text style={styles.submitButtonText}>
                  {editingTeacherId ? 'Update Teacher' : 'Add Teacher'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  teacherCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teacherInfo: {
    flex: 1,
  },
  teacherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  teacherNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  inactiveBadge: {
    backgroundColor: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  inactiveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  teacherEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  teacherSchool: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 2,
  },
  teacherClass: {
    fontSize: 12,
    color: '#666',
  },
  teacherActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
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
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalForm: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
    color: '#333',
  },
  schoolSelector: {
    marginBottom: 16,
  },
  schoolOption: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#f9f9f9',
  },
  schoolOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  schoolOptionText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  schoolOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  statusSection: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  toggleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#34C759',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 24,
  },
});
