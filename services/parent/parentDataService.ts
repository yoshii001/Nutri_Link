import { getStudentByAccessCode, updateStudentAllergiesAndFeedback } from '@/services/firebase/studentService';
import { getMealTrackingByDate } from '@/services/firebase/mealTrackingService';
import { getReadyDonationsByClassId } from '@/services/firebase/readyDonationService';
import { getDonorAverageRating } from '@/services/firebase/donorRatingService';
import { getMealStockByClass } from '@/services/firebase/mealStockService';
import { getMealPlansBySchoolId } from '@/services/firebase/mealPlanService';
import { getClassById, findSchoolIdByClassId } from '@/services/firebase/classService';
import { StudentProfile, MealPlan } from '@/types';

export interface TodayMealInfo {
  mealServed: boolean;
  time?: string;
  notes?: string;
  mealReaction?: 'happy' | 'little' | 'none';
  healthObservation?: 'tired' | 'sick' | 'active' | null;
}

export interface DonorInfo {
  donorId: string;
  donorName: string;
  itemName: string;
  quantity: number;
  unit: string;
  description?: string;
  averageRating: number;
  totalRatings: number;
}

export interface TodayMealStock {
  mealName: string;
  donorName: string;
  quantity: number;
  unit: string;
  coverage: number;
  description?: string;
  donorId?: string;
  averageRating: number;
  totalRatings: number;
}

export interface ScheduledMealInfo {
  date: string;
  mealName: string;
  donorName: string;
  quantity: number;
  unit: string;
  coverage: number;
  description?: string;
  claimedAt: string;
}

export interface ApprovedMealPlan {
  planId: string;
  date: string;
  menu: Array<{
    mealName: string;
    quantity: number;
    ingredients: string[];
    dietaryRestrictions?: string[];
  }>;
  approvedAt?: string;
  status: string;
}

export const refreshStudentData = async (accessCode: string): Promise<{
  teacherId: string;
  studentKey: string;
  student: StudentProfile;
} | null> => {
  try {
    const result = await getStudentByAccessCode(accessCode);
    return result;
  } catch (error) {
    console.error('Error refreshing student data:', error);
    throw error;
  }
};

export const getTodayMealInfo = async (teacherId: string, studentId: string): Promise<TodayMealInfo | null> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const mealData = await getMealTrackingByDate(today);

    if (mealData && mealData.students && mealData.students[studentId]) {
      return mealData.students[studentId];
    }

    return null;
  } catch (error) {
    console.error('Error getting today meal info:', error);
    return null;
  }
};

export const getTodayDonorInfo = async (classId: string): Promise<DonorInfo | null> => {
  try {
    const donations = await getReadyDonationsByClassId(classId);
    const today = new Date().toISOString().split('T')[0];

    const todayDonations = Object.values(donations).filter(
      (d) => d.status === 'completed' && d.completedAt?.startsWith(today)
    );

    if (todayDonations.length === 0) {
      return null;
    }

    const donation = todayDonations[0];
    const rating = await getDonorAverageRating(donation.donorId);

    return {
      donorId: donation.donorId,
      donorName: donation.donorName,
      itemName: donation.itemName || 'N/A',
      quantity: donation.quantity || 0,
      unit: donation.unit || 'unit',
      description: donation.description,
      averageRating: rating.average,
      totalRatings: rating.count,
    };
  } catch (error) {
    console.error('Error getting today donor info:', error);
    return null;
  }
};

export const getTodayMealFromStock = async (schoolId: string, classId: string): Promise<TodayMealStock | null> => {
  try {
    console.log('[Parent] Getting meal stock for schoolId:', schoolId, 'classId:', classId);
    const mealStocks = await getMealStockByClass(schoolId, classId);
    console.log('[Parent] Retrieved meal stocks:', mealStocks);

    const today = new Date().toISOString().split('T')[0];
    console.log('[Parent] Today date:', today);

    let todayMeal = null;
    let todayMealKey = '';

    for (const [key, meal] of Object.entries(mealStocks)) {
      console.log('[Parent] Checking meal key:', key, 'against today:', today);
      if (key.startsWith(today)) {
        todayMeal = meal;
        todayMealKey = key;
        console.log('[Parent] Found today meal:', todayMeal);
        break;
      }
    }

    if (!todayMeal) {
      console.log('[Parent] No meal found for today');
      return null;
    }

    let rating = { average: 0, count: 0 };
    let donorId = todayMeal.donorId;

    if (!donorId && todayMeal.donorName) {
      const allDonations = await getReadyDonationsByClassId(classId);
      const donorDonation = Object.values(allDonations).find(
        (d) => d.donorName === todayMeal.donorName
      );
      if (donorDonation?.donorId) {
        donorId = donorDonation.donorId;
      }
    }

    if (donorId) {
      rating = await getDonorAverageRating(donorId);
    }

    return {
      mealName: todayMeal.mealName,
      donorName: todayMeal.donorName,
      quantity: todayMeal.quantity,
      unit: todayMeal.unit,
      coverage: todayMeal.coverage,
      description: todayMeal.description,
      donorId: donorId,
      averageRating: rating.average,
      totalRatings: rating.count,
    };
  } catch (error) {
    console.error('Error getting today meal from stock:', error);
    return null;
  }
};

export const getDonorIdByName = async (classId: string, donorName: string): Promise<string | null> => {
  try {
    const allDonations = await getReadyDonationsByClassId(classId);
    const donorDonation = Object.values(allDonations).find(
      (d) => d.donorName === donorName
    );
    return donorDonation?.donorId || null;
  } catch (error) {
    console.error('Error getting donor ID by name:', error);
    return null;
  }
};

export const updateStudentAllergies = async (
  teacherId: string,
  studentKey: string,
  allergies: string
): Promise<void> => {
  try {
    await updateStudentAllergiesAndFeedback(teacherId, studentKey, allergies, undefined);
  } catch (error) {
    console.error('Error updating student allergies:', error);
    throw error;
  }
};

export const updateMealFeedback = async (
  teacherId: string,
  studentKey: string,
  feedback: string
): Promise<void> => {
  try {
    await updateStudentAllergiesAndFeedback(teacherId, studentKey, undefined, feedback);
  } catch (error) {
    console.error('Error updating meal feedback:', error);
    throw error;
  }
};

export const updateAllergiesAndFeedback = async (
  teacherId: string,
  studentKey: string,
  allergies: string,
  feedback: string
): Promise<void> => {
  try {
    await updateStudentAllergiesAndFeedback(teacherId, studentKey, allergies, feedback);
  } catch (error) {
    console.error('Error updating allergies and feedback:', error);
    throw error;
  }
};

export const getScheduledMeals = async (schoolId: string, classId: string): Promise<ScheduledMealInfo[]> => {
  try {
    const mealStocks = await getMealStockByClass(schoolId, classId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduledMeals: ScheduledMealInfo[] = [];
    const seenDates = new Set<string>();

    Object.entries(mealStocks).forEach(([dateId, meal]) => {
      const mealDate = dateId.split('_')[0];
      const mealDateTime = new Date(mealDate);
      mealDateTime.setHours(0, 0, 0, 0);

      if (mealDateTime >= today && !seenDates.has(mealDate)) {
        seenDates.add(mealDate);
        scheduledMeals.push({
          date: mealDate,
          mealName: meal.mealName,
          donorName: meal.donorName,
          quantity: meal.quantity,
          unit: meal.unit,
          coverage: meal.coverage,
          description: meal.description,
          claimedAt: meal.claimedAt,
        });
      }
    });

    scheduledMeals.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return scheduledMeals.slice(0, 7);
  } catch (error) {
    const foundSchoolId = await findSchoolIdByClassId(classId);
    if (foundSchoolId) {
      return foundSchoolId;
    }

    console.error('Error getting scheduled meals:', error);
    return [];
  }
};

export const getSchoolIdFromClass = async (teacherId: string, classId: string): Promise<string> => {
  try {
    console.log('[Parent] Getting school ID for teacherId (userId):', teacherId, 'classId:', classId);

    const { getTeacherByUserId } = await import('@/services/firebase/teacherService');
    const teacherData = await getTeacherByUserId(teacherId);

    if (!teacherData) {
      console.log('[Parent] Teacher not found for user ID:', teacherId);
      return teacherId;
    }

    console.log('[Parent] Found teacher, schoolId:', teacherData.teacher.schoolId);
    const schoolId = teacherData.teacher.schoolId;

    const classInfo = await getClassById(schoolId, classId);
    console.log('[Parent] Class info:', classInfo);

    return classInfo?.schoolId || schoolId;
  } catch (error) {
    console.error('Error getting school ID from class:', error);
    return teacherId;
  }
};

export const getApprovedMealPlans = async (schoolId: string): Promise<ApprovedMealPlan[]> => {
  try {
    const allPlans = await getMealPlansBySchoolId(schoolId);
    const approvedPlans: ApprovedMealPlan[] = [];
    const today = new Date();

    Object.entries(allPlans).forEach(([planId, plan]) => {
      if (plan.status === 'approved') {
        const planDate = new Date(plan.date);
        if (planDate >= today) {
          approvedPlans.push({
            planId,
            date: plan.date,
            menu: plan.menu,
            approvedAt: plan.approvedAt,
            status: plan.status,
          });
        }
      }
    });

    approvedPlans.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return approvedPlans.slice(0, 5);
  } catch (error) {
    console.error('Error getting approved meal plans:', error);
    return [];
  }
};
