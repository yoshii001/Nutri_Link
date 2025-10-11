import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/constants/theme';
import { Users, UtensilsCrossed, ClipboardCheck, BarChart, Package } from 'lucide-react-native';
import TeacherHeader from '@/components/TeacherHeader';
import TeacherBottomNav from '@/components/TeacherBottomNav';

export default function TeacherDashboard() {
  const router = useRouter();
  const { userData } = useAuth();

  return (
    <View style={styles.container}>
      <TeacherHeader title="Teacher Dashboard" subtitle={`Welcome, ${userData?.name || 'Teacher'}`} />

      <ScrollView style={styles.content}>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.card} onPress={() => router.push('/teacher/claim-meal' as any)}>
            <Package size={32} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Claim Meals</Text>
            <Text style={styles.cardDesc}>View and claim available donations for your class</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => router.push('/teacher/students' as any)}>
            <Users size={32} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Manage Students</Text>
            <Text style={styles.cardDesc}>Add or view student profiles and share links</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => router.push('/teacher/serve-meals' as any)}>
            <UtensilsCrossed size={32} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Serve Meals</Text>
            <Text style={styles.cardDesc}>Mark meals served to students</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => router.push('/teacher/attendance' as any)}>
            <ClipboardCheck size={32} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Mark Attendance & Feedback</Text>
            <Text style={styles.cardDesc}>Track daily attendance and give feedback</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => router.push('/teacher/reports' as any)}>
            <BarChart size={32} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Monthly Reports</Text>
            <Text style={styles.cardDesc}>View performance and attendance summaries</Text>
          </TouchableOpacity>
        </View>
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
  },
  actions: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
    marginTop: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 4,
    lineHeight: 20,
  },
});
