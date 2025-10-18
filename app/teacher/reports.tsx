import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentsByTeacher } from '@/services/firebase/studentService';
import { getTeacherByUserId } from '@/services/firebase/teacherService';
import { getMealStockByClass } from '@/services/firebase/mealStockService';
import { theme } from '@/constants/theme';
import TeacherHeader from '@/components/TeacherHeader';
import TeacherBottomNav from '@/components/TeacherBottomNav';

export default function ReportsScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Record<string, any>>({});
  const [mealStock, setMealStock] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const [studentsList, teacherData] = await Promise.all([
          getStudentsByTeacher(user.uid),
          getTeacherByUserId(user.uid)
        ]);
        
        setStudents(studentsList || {});
        
        if (teacherData?.teacher?.classId) {
          const meals = await getMealStockByClass(
            teacherData.teacher.schoolId, 
            teacherData.teacher.classId
          );
          setMealStock(meals || {});
        }
      } catch (err) {
        console.error('Failed to load data', err);
      }
    };
    loadData();
  }, [user]);

  const total = Object.keys(students).length;
  const served = Object.values(students).filter((s: any) => s.mealServedToday).length;
  const notServed = total - served;

  return (
    <View style={{ flex: 1 }}>
      <TeacherHeader title="📊 Reports" subtitle={`${total} Students`} />

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Stats Card */}
        <View style={[styles.card, theme.shadows.md]}>
          <Text style={styles.cardTitle}>Today's Summary</Text>
          
          <View style={styles.statsRow}>
            <View style={[styles.stat, { backgroundColor: theme.colors.success + '15' }]}>
              <Text style={styles.emoji}>✅</Text>
              <Text style={styles.statLabel}>Served</Text>
              <Text style={styles.statNumber}>{served}</Text>
            </View>

            <View style={[styles.stat, { backgroundColor: theme.colors.error + '15' }]}>
              <Text style={styles.emoji}>❌</Text>
              <Text style={styles.statLabel}>Not Served</Text>
              <Text style={styles.statNumber}>{notServed}</Text>
            </View>
          </View>
        </View>

        {/* Meals List */}
        {Object.keys(mealStock).length > 0 && (
          <View style={[styles.card, theme.shadows.md]}>
            <Text style={styles.cardTitle}>🍽️ Claimed Meals</Text>
            {Object.entries(mealStock).map(([id, meal]: any) => (
              <View key={id} style={styles.mealRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealName}>{meal.mealName}</Text>
                  <Text style={styles.mealCoverage}>{meal.coverage}</Text>
                </View>
                <Text style={styles.quantity}>{meal.quantity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Print Button */}
        <TouchableOpacity
          onPress={async () => {
            try {
              await generateReportPDF();
            } catch (err) {
              Alert.alert('Error', 'Could not generate PDF');
            }
          }}
          style={[styles.button, theme.shadows.md]}
        >
          <Text style={styles.buttonText}>🖨️ Print Report</Text>
        </TouchableOpacity>
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
  card: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
  },
  cardTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  stat: {
    flex: 1,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  statNumber: {
    fontFamily: 'Inter-Bold',
    fontSize: 36,
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  mealName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  mealCoverage: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  quantity: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: theme.colors.primary,
  },
  button: {
    margin: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: theme.colors.surface,
  },
});

async function generateReportPDF() {
  let Print: any = null;
  let Sharing: any = null;
  try {
    Print = require('expo-print');
    Sharing = require('expo-sharing');
  } catch (err) {
    Alert.alert('Printing not available');
    return;
  }

  const { getCurrentUser } = require('@/contexts/AuthContext');
  const user = getCurrentUser ? getCurrentUser() : null;
  let studentsData: Record<string, any> = {};
  let meals: Record<string, any> = {};
  
  try {
    const getStudents = require('@/services/firebase/studentService').getStudentsByTeacher;
    studentsData = (await getStudents(user.uid)) || {};
    
    const teacherData = await require('@/services/firebase/teacherService').getTeacherByUserId(user.uid);
    if (teacherData?.teacher?.classId) {
      meals = (await require('@/services/firebase/mealStockService').getMealStockByClass(
        teacherData.teacher.schoolId, 
        teacherData.teacher.classId
      )) || {};
    }
  } catch (err) {
    console.warn('Could not fetch data for PDF', err);
  }

  const total = Object.keys(studentsData).length;
  const served = Object.values(studentsData).filter((s: any) => s.mealServedToday).length;
  const notServed = total - served;

  const mealsHtml = Object.entries(meals).map(([id, m]: any) => `
    <tr>
      <td style="padding:10px;border:1px solid #ddd">${m.mealName}</td>
      <td style="padding:10px;border:1px solid #ddd;text-align:center">${m.quantity}</td>
      <td style="padding:10px;border:1px solid #ddd">${m.coverage}</td>
    </tr>
  `).join('');

  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f4f4f4; padding: 10px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <h1>📊 Meal Report</h1>
        <p><strong>Total Students:</strong> ${total}</p>
        <p><strong>Served:</strong> ${served} (${total ? Math.round((served/total)*100) : 0}%)</p>
        <p><strong>Not Served:</strong> ${notServed} (${total ? Math.round((notServed/total)*100) : 0}%)</p>
        
        <h2>Claimed Meals</h2>
        <table>
          <tr>
            <th>Meal</th>
            <th>Quantity</th>
            <th>Coverage</th>
          </tr>
          ${mealsHtml || '<tr><td colspan="3" style="text-align:center;padding:20px">No meals</td></tr>'}
        </table>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri);
  } else {
    Alert.alert('Saved', uri);
  }
}