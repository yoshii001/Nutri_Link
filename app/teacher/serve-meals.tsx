import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getStudentsByTeacher,
  updateStudent,
} from '@/services/firebase/studentService';
import { getTeacherByUserId } from '@/services/firebase/teacherService';
import { getClassesBySchoolId } from '@/services/firebase/classService';
import {
  getMealStockByClass,
  decreaseMealStock,
  MealStock,
} from '@/services/firebase/mealStockService';
import { StudentProfile } from '@/types';
import { theme } from '@/constants/theme';
import { CheckCircle, Circle, User, Package, X } from 'lucide-react-native';
import TeacherHeader from '@/components/TeacherHeader';
import TeacherBottomNav from '@/components/TeacherBottomNav';

interface StudentWithServed extends StudentProfile {
  mealServedToday?: boolean;
}

export default function ServeMealsScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Record<string, StudentWithServed>>({});
  const [query, setQuery] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');
  const [mealStock, setMealStock] = useState<Record<string, MealStock>>({});
  const [showMealSelector, setShowMealSelector] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    student: StudentWithServed;
  } | null>(null);

  const load = async () => {
    if (!user) return;
    const list = await getStudentsByTeacher(user.uid);
    setStudents(list || {});
  };

  const loadTeacherData = async () => {
    if (!user) return;
    try {
      const teacherData = await getTeacherByUserId(user.uid);
      if (!teacherData) return;

      setSchoolId(teacherData.teacher.schoolId);

      const allClasses = await getClassesBySchoolId(teacherData.teacher.schoolId);
      let assignedClassId = '';

      for (const [id, classInfo] of Object.entries(allClasses)) {
        if (classInfo.teacherId === teacherData.id) {
          assignedClassId = id;
          break;
        }
      }

      setClassId(assignedClassId);

      if (assignedClassId) {
        const meals = await getMealStockByClass(
          teacherData.teacher.schoolId,
          assignedClassId
        );
        setMealStock(meals);
      }
    } catch (error) {
      console.error('Error loading teacher data:', error);
    }
  };

  useEffect(() => {
    load();
    loadTeacherData();
  }, [user]);

  const handleServeMeal = async (studentKey: string, student: StudentWithServed) => {
    if (student.mealServedToday) {
      try {
        await updateStudent(user!.uid, studentKey, {
          mealServedToday: false,
        });

        setStudents((prev) => ({
          ...prev,
          [studentKey]: {
            ...prev[studentKey],
            mealServedToday: false,
          },
        }));

        Alert.alert('Success', `Meal marking removed for ${student.name}`);
      } catch (error) {
        console.error('Error updating meal status:', error);
        Alert.alert('Error', 'Failed to update meal status');
      }
    } else {
      if (Object.keys(mealStock).length === 0) {
        Alert.alert('No Meals', 'No meals in stock. Please claim meals first.');
        return;
      }
      setSelectedStudent({ id: studentKey, student });
      setShowMealSelector(true);
    }
  };

  const serveMealWithStock = async (mealId: string, mealName: string) => {
    if (!selectedStudent) return;

    try {
      await decreaseMealStock(schoolId, classId, mealId, 1);

      await updateStudent(user!.uid, selectedStudent.id, {
        mealServedToday: true,
      });

      setStudents((prev) => ({
        ...prev,
        [selectedStudent.id]: {
          ...prev[selectedStudent.id],
          mealServedToday: true,
        },
      }));

      const updatedMeals = await getMealStockByClass(schoolId, classId);
      setMealStock(updatedMeals);

      setShowMealSelector(false);
      setSelectedStudent(null);

      Alert.alert('Success', `${mealName} served to ${selectedStudent.student.name}`);
    } catch (error) {
      console.error('Error serving meal:', error);
      Alert.alert('Error', 'Failed to serve meal');
    }
  };

  const filtered = Object.entries(students).filter(([id, s]) => {
    const q = query.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q)
    );
  });

  const servedCount = Object.values(students).filter((s) => s.mealServedToday).length;
  const totalCount = Object.keys(students).length;

  return (
    <View style={styles.container}>
      <TeacherHeader
        title="Serve Meals"
        subtitle={`${servedCount} / ${totalCount} served`}
      />

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={([id]) => id}
        renderItem={({ item: [id, s] }) => (
          <TouchableOpacity
            style={[
              styles.studentRow,
              s.mealServedToday && styles.studentRowServed,
            ]}
            onPress={() => handleServeMeal(id, s)}
          >
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{s.name}</Text>
              <Text style={styles.studentDetail}>ID: {s.studentId}</Text>
              {s.allergies && (
                <Text style={styles.allergiesText}>Allergies: {s.allergies}</Text>
              )}
            </View>
            <View style={styles.checkIcon}>
              {s.mealServedToday ? (
                <CheckCircle color={theme.colors.primary} size={32} />
              ) : (
                <Circle color="#ccc" size={32} />
              )}
            </View>
          </TouchableOpacity>
        )}
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

      <Modal visible={showMealSelector} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Meal</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowMealSelector(false);
                  setSelectedStudent(null);
                }}
              >
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedStudent && (
              <Text style={styles.modalSubtitle}>
                Serving to: {selectedStudent.student.name}
              </Text>
            )}

            <ScrollView style={styles.mealList}>
              {Object.entries(mealStock).map(([id, meal]) => (
                <TouchableOpacity
                  key={id}
                  style={styles.mealOption}
                  onPress={() => serveMealWithStock(id, meal.mealName)}
                  disabled={meal.coverage <= 0}
                >
                  <Package
                    size={20}
                    color={meal.coverage > 0 ? theme.colors.primary : '#ccc'}
                  />
                  <View style={styles.mealOptionContent}>
                    <Text
                      style={[
                        styles.mealOptionName,
                        meal.coverage <= 0 && styles.mealOptionNameDisabled,
                      ]}
                    >
                      {meal.mealName}
                    </Text>
                    <Text style={styles.mealOptionDetails}>
                      Can serve {meal.coverage} more students
                    </Text>
                    <Text style={styles.mealOptionQuantity}>
                      {meal.quantity} {meal.unit} available
                    </Text>
                  </View>
                  {meal.coverage > 0 ? (
                    <CheckCircle size={20} color={theme.colors.primary} />
                  ) : (
                    <Text style={styles.outOfStockText}>Out of Stock</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  studentRowServed: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
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
  allergiesText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  checkIcon: {
    marginLeft: theme.spacing.md,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    maxHeight: '80%',
    padding: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  mealList: {
    maxHeight: 400,
  },
  mealOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border || '#E5E7EB',
  },
  mealOptionContent: {
    flex: 1,
  },
  mealOptionName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  mealOptionNameDisabled: {
    color: theme.colors.text.light,
  },
  mealOptionDetails: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  mealOptionQuantity: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
  },
  outOfStockText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
  },
});
