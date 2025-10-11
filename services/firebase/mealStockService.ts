import { ref, get, set, update, onValue, off } from 'firebase/database';
import { database } from '@/config/firebase';

export interface MealStock {
  mealName: string;
  quantity: number;
  coverage: number;
  unit: string;
  claimedAt: string;
  claimedBy: string;
  donorName: string;
  description?: string;
}

export const addMealToClassStock = async (
  schoolId: string,
  classId: string,
  dateId: string,
  mealData: MealStock
): Promise<void> => {
  console.log('addMealToClassStock called', { schoolId, classId, dateId, mealData });
  const path = `classes/${schoolId}/${classId}/meals/${dateId}`;
  console.log('Firebase path:', path);
  const mealRef = ref(database, path);
  await set(mealRef, mealData);
  console.log('Meal successfully saved to Firebase');
};

export const getMealStockByClass = async (
  schoolId: string,
  classId: string
): Promise<Record<string, MealStock>> => {
  const mealsRef = ref(database, `classes/${schoolId}/${classId}/meals`);
  const snapshot = await get(mealsRef);

  if (!snapshot.exists()) {
    return {};
  }

  return snapshot.val() as Record<string, MealStock>;
};

export const updateMealStock = async (
  schoolId: string,
  classId: string,
  dateId: string,
  updates: Partial<MealStock>
): Promise<void> => {
  const mealRef = ref(database, `classes/${schoolId}/${classId}/meals/${dateId}`);
  await update(mealRef, updates);
};

export const decreaseMealStock = async (
  schoolId: string,
  classId: string,
  dateId: string,
  amount: number
): Promise<void> => {
  const mealRef = ref(database, `classes/${schoolId}/${classId}/meals/${dateId}`);
  const snapshot = await get(mealRef);

  if (snapshot.exists()) {
    const meal = snapshot.val() as MealStock;
    const newQuantity = Math.max(0, meal.quantity - amount);
    const newCoverage = Math.max(0, meal.coverage - 1);

    await update(mealRef, {
      quantity: newQuantity,
      coverage: newCoverage,
    });
  }
};

export const deleteMealFromStock = async (
  schoolId: string,
  classId: string,
  dateId: string
): Promise<void> => {
  const mealRef = ref(database, `classes/${schoolId}/${classId}/meals/${dateId}`);
  await set(mealRef, null);
};

export const listenToClassMealStock = (
  schoolId: string,
  classId: string,
  callback: (meals: Record<string, MealStock>) => void
): (() => void) => {
  const mealsRef = ref(database, `classes/${schoolId}/${classId}/meals`);

  const listener = onValue(mealsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }

    callback(snapshot.val() as Record<string, MealStock>);
  });

  return () => off(mealsRef, 'value', listener);
};
