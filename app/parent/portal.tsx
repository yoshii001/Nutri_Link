import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  getStudentByIdAndToken,
  updateStudentAllergiesAndFeedback,
} from '@/services/firebase/studentService';
import { getMealProposalsByClassId } from '@/services/firebase/mealProposalService';
import { StudentProfile, MealProposal } from '@/types';
import { theme } from '@/constants/theme';
import { User, Check, Calendar } from 'lucide-react-native';

export default function ParentPortalScreen() {
  const [studentRegId, setStudentRegId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [teacherId, setTeacherId] = useState('');
  const [studentKey, setStudentKey] = useState('');
  const [meals, setMeals] = useState<Record<string, MealProposal>>({});

  const [allergies, setAllergies] = useState('');
  const [mealFeedbacks, setMealFeedbacks] = useState('');

  const handleVerify = async () => {
    if (!studentRegId.trim() || !accessToken.trim()) {
      Alert.alert('Error', 'Please enter Student ID and Access Token');
      return;
    }

    try {
      const result = await getStudentByIdAndToken(studentRegId.trim(), accessToken.trim());

      if (!result) {
        Alert.alert('Verification Failed', 'Invalid Student ID or Access Token');
        return;
      }

      setIsVerified(true);
      setStudent(result.student);
      setTeacherId(result.teacherId);
      setStudentKey(result.studentKey);
      setAllergies(result.student.allergies || '');
      setMealFeedbacks(result.student.mealFeedbacks || '');

      if (result.student.classId) {
        const mealData = await getMealProposalsByClassId(result.student.classId);
        setMeals(mealData);
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'Failed to verify student information');
    }
  };

  const handleSave = async () => {
    if (!teacherId || !studentKey) return;

    try {
      await updateStudentAllergiesAndFeedback(teacherId, studentKey, allergies, mealFeedbacks);
      Alert.alert('Success', 'Information updated successfully!');
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save information');
    }
  };

  if (!isVerified) {
    return (
      <View style={styles.container}>
        <View style={styles.verifyContainer}>
          <User color={theme.colors.primary} size={64} />
          <Text style={styles.title}>Parent Portal</Text>
          <Text style={styles.subtitle}>Enter your student's information to access</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Student ID (Reg No)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter student ID"
              value={studentRegId}
              onChangeText={setStudentRegId}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Access Token</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter access token"
              value={accessToken}
              onChangeText={setAccessToken}
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
              <Text style={styles.verifyButtonText}>Verify & Access</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Welcome, {student?.parentName}</Text>
        <Text style={styles.headerSubtitle}>Student: {student?.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Proposed Meals</Text>
        {Object.keys(meals).length === 0 ? (
          <View style={styles.emptyCard}>
            <Calendar color="#ccc" size={48} />
            <Text style={styles.emptyText}>No meal proposals yet</Text>
          </View>
        ) : (
          Object.entries(meals).map(([id, meal]) => (
            <View key={id} style={styles.mealCard}>
              <Text style={styles.mealName}>{meal.mealName}</Text>
              <Text style={styles.mealDescription}>{meal.mealDescription}</Text>
              <Text style={styles.mealDate}>Date: {meal.date}</Text>
              <Text style={styles.mealIngredients}>
                Ingredients: {meal.ingredients.join(', ')}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Allergies Information</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Enter any allergies or dietary restrictions"
          value={allergies}
          onChangeText={setAllergies}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meal Feedbacks</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Share your feedback about the meals"
          value={mealFeedbacks}
          onChangeText={setMealFeedbacks}
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Check color="#fff" size={20} />
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  verifyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xl,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  verifyButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  verifyButtonText: {
    color: theme.colors.text.inverse,
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  header: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.xl,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  mealCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  mealName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  mealDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  mealDate: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  mealIngredients: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.primary,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  textArea: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.lg,
  },
  saveButtonText: {
    color: theme.colors.text.inverse,
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
});
