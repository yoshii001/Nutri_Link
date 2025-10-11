import { addDonorRating, DonorRating } from '@/services/firebase/donorRatingService';

export interface ParentRatingInput {
  donorId: string;
  donorName: string;
  parentName: string;
  studentName: string;
  rating: number;
  comment?: string;
}

export const submitDonorRating = async (ratingInput: ParentRatingInput): Promise<void> => {
  try {
    if (ratingInput.rating < 1 || ratingInput.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const rating: DonorRating = {
      donorId: ratingInput.donorId,
      donorName: ratingInput.donorName,
      parentName: ratingInput.parentName,
      studentName: ratingInput.studentName,
      rating: ratingInput.rating,
      comment: ratingInput.comment,
      createdAt: new Date().toISOString(),
    };

    await addDonorRating(rating);
  } catch (error) {
    console.error('Error submitting donor rating:', error);
    throw error;
  }
};
