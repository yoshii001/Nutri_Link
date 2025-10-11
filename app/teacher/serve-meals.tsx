import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getStudentsByTeacher,
  updateStudent,
} from '@/services/firebase/studentService';
import { StudentProfile } from '@/types';
import { theme } from '@/constants/theme';
import { CheckCircle, Circle, User } from 'lucide-react-native';

interface StudentWithServed extends StudentProfile {
  mealServedToday?: boolean;
}

export default function ServeMealsScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Record<string, StudentWithServed>>({});
  const [query, setQuery] = useState('');

  const load = async () => {
    if (!user) return;
    const list = await getStudentsByTeacher(user.uid);
    setStudents(list || {});
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleServeMeal = async (studentKey: string, student: StudentWithServed) => {
    try {
      const newStatus = !student.mealServedToday;
      await updateStudent(user!.uid, studentKey, {
        mealServedToday: newStatus,
      });

      setStudents((prev) => ({
        ...prev,
        [studentKey]: {
          ...prev[studentKey],
          mealServedToday: newStatus,
        },
      }));

      Alert.alert(
        'Success',
        newStatus
          ? `Meal served to ${student.name}`
          : `Meal marking removed for ${student.name}`
      );
    } catch (error) {
      console.error('Error updating meal status:', error);
      Alert.alert('Error', 'Failed to update meal status');
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
      <View style={styles.header}>
        <Text style={styles.title}>Serve Meals</Text>
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {servedCount} / {totalCount}
          </Text>
        </View>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
  },
  counter: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  counterText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#fff',
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
});
