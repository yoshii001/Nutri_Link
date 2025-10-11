import { ref, get, update } from 'firebase/database';
import { database } from '@/config/firebase';
import { StudentProfile } from '@/types';

export interface ParentStudentData {
  teacherId: string;
  studentKey: string;
  student: StudentProfile;
}

export interface TodayMealInfo {
  mealServed: boolean;
  mealName?: string;
  time?: string;
  notes?: string;
  teacherName?: string;
}

export interface DonorInfo {
  donorId: string;
  donorName: string;
  donorEmail?: string;
  itemName: string;
  quantity: number;
  unit: string;
  description?: string;
  averageRating: number;
  totalRatings: number;
}

export const getStudentByAccessCode = async (
  accessCode: string
): Promise<ParentStudentData | null> => {
  try {
    const studentsRef = ref(database, 'students');
    const snapshot = await get(studentsRef);

    if (!snapshot.exists()) return null;

    const allTeachers = snapshot.val();

    for (const [teacherId, students] of Object.entries(allTeachers)) {
      for (const [studentKey, student] of Object.entries(
        students as Record<string, StudentProfile>
      )) {
        if (student.parentAccessToken === accessCode) {
          return {
            teacherId,
            studentKey,
            student,
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('parentService.getStudentByAccessCode error:', error);
    throw error;
  }
};

export const updateParentSubmittedInfo = async (
  teacherId: string,
  studentKey: string,
  updates: {
    allergies?: string;
    mealFeedbacks?: string;
  }
): Promise<void> => {
  try {
    const studentRef = ref(database, `students/${teacherId}/${studentKey}`);
    const updatePayload: any = {};

    if (updates.allergies !== undefined) {
      updatePayload.allergies = updates.allergies;
    }

    if (updates.mealFeedbacks !== undefined) {
      updatePayload.mealFeedbacks = updates.mealFeedbacks;
    }

    await update(studentRef, updatePayload);
  } catch (error) {
    console.error('parentService.updateParentSubmittedInfo error:', error);
    throw error;
  }
};

export const getTodayMealForStudent = async (
  teacherId: string,
  studentId: string
): Promise<TodayMealInfo | null> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const mealTrackingRef = ref(database, `meal-tracking/${teacherId}/${today}`);
    const snapshot = await get(mealTrackingRef);

    if (!snapshot.exists()) return null;

    const mealData = snapshot.val();
    const studentMeal = mealData.students?.[studentId];

    if (!studentMeal) return null;

    return {
      mealServed: studentMeal.mealServed || false,
      mealName: studentMeal.mealName,
      time: studentMeal.time,
      notes: studentMeal.notes,
      teacherName: mealData.teacherName,
    };
  } catch (error) {
    console.error('parentService.getTodayMealForStudent error:', error);
    throw error;
  }
};

export const getDonorInfoForClass = async (
  classId: string
): Promise<DonorInfo | null> => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const assignmentsRef = ref(database, 'donation-assignments');
    const snapshot = await get(assignmentsRef);

    if (!snapshot.exists()) return null;

    const assignments = snapshot.val();
    let todayAssignment: any = null;

    for (const [key, assignment] of Object.entries(assignments)) {
      const assignmentData = assignment as any;
      if (
        assignmentData.classId === classId &&
        assignmentData.servedAt?.startsWith(today)
      ) {
        todayAssignment = assignmentData;
        break;
      }
    }

    if (!todayAssignment) return null;

    const ratingsRef = ref(database, `donorRatings/${todayAssignment.donorId}`);
    const ratingsSnapshot = await get(ratingsRef);

    let averageRating = 0;
    let totalRatings = 0;

    if (ratingsSnapshot.exists()) {
      const ratings = Object.values(ratingsSnapshot.val()) as any[];
      totalRatings = ratings.length;
      const sum = ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
      averageRating = totalRatings > 0 ? sum / totalRatings : 0;
    }

    return {
      donorId: todayAssignment.donorId,
      donorName: todayAssignment.donorName,
      donorEmail: todayAssignment.donorEmail,
      itemName: todayAssignment.itemName,
      quantity: todayAssignment.quantity,
      unit: todayAssignment.unit,
      description: todayAssignment.notes,
      averageRating,
      totalRatings,
    };
  } catch (error) {
    console.error('parentService.getDonorInfoForClass error:', error);
    throw error;
  }
};
