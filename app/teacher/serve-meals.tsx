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
import { CheckCircle, Circle, User, Package, X, Search, AlertTriangle } from 'lucide-react-native';
import TeacherHeader from '@/components/TeacherHeader';
import TeacherBottomNav from '@/components/TeacherBottomNav';

interface StudentWithServed extends StudentProfile {
  mealServedToday?: boolean;
}

// Modern color palette
const COLORS = {
  ocean: '#0891B2',
  mint: '#10B981',
  coral: '#F43F5E',
  amber: '#F59E0B',
  slate: '#64748B',
  neutral: '#F8FAFC',
};

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
  const progressPercentage = totalCount > 0 ? (servedCount / totalCount) * 100 : 0;

  return (
    <View style={styles.container}>
      <TeacherHeader
        title="Serve Meals"
        subtitle="Track daily meal distribution"
      />


      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color={COLORS.slate} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or ID..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {/* Progress Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <Text style={styles.progressSubtitle}>
              {servedCount} of {totalCount} students
            </Text>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressPercent}>{Math.round(progressPercentage)}%</Text>
          </View>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.mint + '15' }]}>
              <CheckCircle size={18} color={COLORS.mint} strokeWidth={2.5} />
            </View>
            <Text style={styles.statValue}>{servedCount}</Text>
            <Text style={styles.statLabel}>Served</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.slate + '15' }]}>
              <Circle size={18} color={COLORS.slate} strokeWidth={2.5} />
            </View>
            <Text style={styles.statValue}>{totalCount - servedCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </View>

      

      {/* Student List */}
      <FlatList
        data={filtered}
        keyExtractor={([id]) => id}
        renderItem={({ item: [id, s] }) => (
          <TouchableOpacity
            style={[
              styles.studentCard,
              s.mealServedToday && styles.studentCardServed,
            ]}
            onPress={() => handleServeMeal(id, s)}
            activeOpacity={0.7}
          >
            <View style={styles.studentCardContent}>
              <View style={[
                styles.studentAvatar,
                s.mealServedToday && { backgroundColor: COLORS.mint + '15' }
              ]}>
                <User 
                  size={24} 
                  color={s.mealServedToday ? COLORS.mint : COLORS.slate} 
                  strokeWidth={2.5}
                />
              </View>
              
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{s.name}</Text>
                <Text style={styles.studentId}>ID: {s.studentId}</Text>
                {s.allergies && (
                  <View style={styles.allergyBadge}>
                    <AlertTriangle size={12} color={COLORS.coral} />
                    <Text style={styles.allergyText}>{s.allergies}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={[
              styles.statusIndicator,
              s.mealServedToday && styles.statusIndicatorServed
            ]}>
              {s.mealServedToday ? (
                <>
                  <CheckCircle size={24} color={COLORS.mint} strokeWidth={2.5} />
                  <Text style={styles.statusTextServed}>Served</Text>
                </>
              ) : (
                <>
                  <Circle size={24} color={COLORS.slate} strokeWidth={2.5} />
                  <Text style={styles.statusTextPending}>Pending</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <User color={COLORS.slate} size={48} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>
              {query ? 'No students found' : 'No students yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {query ? 'Try a different search term' : 'Add students to get started'}
            </Text>
          </View>
        }
      />

      {/* Meal Selection Modal */}
      <Modal visible={showMealSelector} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Meal</Text>
                {selectedStudent && (
                  <Text style={styles.modalSubtitle}>
                    For: {selectedStudent.student.name}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowMealSelector(false);
                  setSelectedStudent(null);
                }}
              >
                <X size={24} color={COLORS.slate} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.mealList} showsVerticalScrollIndicator={false}>
              {Object.entries(mealStock).map(([id, meal]) => (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.mealCard,
                    meal.coverage <= 0 && styles.mealCardDisabled
                  ]}
                  onPress={() => serveMealWithStock(id, meal.mealName)}
                  disabled={meal.coverage <= 0}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.mealIcon,
                    { backgroundColor: meal.coverage > 0 ? COLORS.ocean + '15' : '#F1F5F9' }
                  ]}>
                    <Package
                      size={22}
                      color={meal.coverage > 0 ? COLORS.ocean : COLORS.slate}
                      strokeWidth={2.5}
                    />
                  </View>
                  
                  <View style={styles.mealInfo}>
                    <Text style={[
                      styles.mealName,
                      meal.coverage <= 0 && styles.mealNameDisabled
                    ]}>
                      {meal.mealName}
                    </Text>
                    <Text style={[
                      styles.mealCoverage,
                      meal.coverage <= 0 && styles.mealCoverageDisabled
                    ]}>
                      Can serve {meal.coverage} more
                    </Text>
                    <Text style={styles.mealQuantity}>
                      {meal.quantity} {meal.unit} available
                    </Text>
                  </View>

                  {meal.coverage > 0 ? (
                    <View style={styles.mealSelectIcon}>
                      <CheckCircle size={20} color={COLORS.ocean} strokeWidth={2.5} />
                    </View>
                  ) : (
                    <View style={styles.outOfStockBadge}>
                      <Text style={styles.outOfStockText}>Out</Text>
                    </View>
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
    backgroundColor: '#F8FAFC',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 20,
    shadowColor: COLORS.ocean,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: COLORS.slate,
  },
  progressBadge: {
    backgroundColor: COLORS.ocean + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressPercent: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: COLORS.ocean,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.ocean,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: COLORS.slate,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop : 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: '#0F172A',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  studentCardServed: {
    borderColor: COLORS.mint,
    backgroundColor: COLORS.mint + '08',
  },
  studentCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  studentId: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: COLORS.slate,
    marginBottom: 4,
  },
  allergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.coral + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  allergyText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: COLORS.coral,
  },
  statusIndicator: {
    alignItems: 'center',
    gap: 4,
  },
  statusIndicatorServed: {
    // Additional styling if needed
  },
  statusTextServed: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: COLORS.mint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextPending: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: COLORS.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: COLORS.slate,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: COLORS.slate,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealList: {
    maxHeight: 500,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  mealCardDisabled: {
    opacity: 0.5,
  },
  mealIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  mealNameDisabled: {
    color: COLORS.slate,
  },
  mealCoverage: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.ocean,
    marginBottom: 2,
  },
  mealCoverageDisabled: {
    color: COLORS.slate,
  },
  mealQuantity: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: COLORS.slate,
  },
  mealSelectIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.ocean + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockBadge: {
    backgroundColor: COLORS.coral + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  outOfStockText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: COLORS.coral,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});