import { ref, get, push, set, update } from 'firebase/database';
import { database } from '@/config/firebase';

export interface DonorRating {
  donorId: string;
  donorName: string;
  parentName: string;
  studentName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export const addDonorRating = async (rating: DonorRating): Promise<string> => {
  try {
    const ratingsRef = ref(database, `donorRatings/${rating.donorId}`);
    const newRatingRef = push(ratingsRef);

    const ratingData = {
      ...rating,
      createdAt: new Date().toISOString(),
    };

    await set(newRatingRef, ratingData);
    return newRatingRef.key!;
  } catch (err) {
    console.error('donorRatingService.addDonorRating error:', err);
    throw err;
  }
};

export const getRatingsByDonorId = async (donorId: string): Promise<Record<string, DonorRating>> => {
  try {
    const ratingsRef = ref(database, `donorRatings/${donorId}`);
    const snapshot = await get(ratingsRef);

    if (!snapshot.exists()) return {};

    return snapshot.val() as Record<string, DonorRating>;
  } catch (err) {
    console.error('donorRatingService.getRatingsByDonorId error:', err);
    throw err;
  }
};

export const getDonorAverageRating = async (donorId: string): Promise<{ average: number; count: number }> => {
  try {
    const ratings = await getRatingsByDonorId(donorId);
    const ratingValues = Object.values(ratings);

    if (ratingValues.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = ratingValues.reduce((acc, rating) => acc + rating.rating, 0);
    const average = sum / ratingValues.length;

    return {
      average: Math.round(average * 10) / 10,
      count: ratingValues.length,
    };
  } catch (err) {
    console.error('donorRatingService.getDonorAverageRating error:', err);
    throw err;
  }
};

export const getAllDonorRatings = async (): Promise<Record<string, Record<string, DonorRating>>> => {
  try {
    const ratingsRef = ref(database, 'donorRatings');
    const snapshot = await get(ratingsRef);

    if (!snapshot.exists()) return {};

    return snapshot.val() as Record<string, Record<string, DonorRating>>;
  } catch (err) {
    console.error('donorRatingService.getAllDonorRatings error:', err);
    throw err;
  }
};
