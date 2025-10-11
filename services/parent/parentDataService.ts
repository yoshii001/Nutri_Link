import { getStudentByAccessCode, updateStudentAllergiesAndFeedback } from '@/services/firebase/studentService';
import { getMealTrackingByDate } from '@/services/firebase/mealTrackingService';
import { getReadyDonationsByClassId } from '@/services/firebase/readyDonationService';
import { getDonorAverageRating } from '@/services/firebase/donorRatingService';
import { getMealStockByClass } from '@/services/firebase/mealStockService';
import { StudentProfile } from '@/types';

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
    const mealStocks = await getMealStockByClass(schoolId, classId);
    const today = new Date().toISOString().split('T')[0];

    const todayMeal = mealStocks[today];

    if (!todayMeal) {
      return null;
    }

    let rating = { average: 0, count: 0 };
    let donorId = undefined;
    if (todayMeal.donorName) {
      const allDonations = await getReadyDonationsByClassId(classId);
      const donorDonation = Object.values(allDonations).find(
        (d) => d.donorName === todayMeal.donorName
      );
      if (donorDonation?.donorId) {
        donorId = donorDonation.donorId;
        rating = await getDonorAverageRating(donorDonation.donorId);
      }
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
