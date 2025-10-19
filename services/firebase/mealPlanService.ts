import { ref, get, set, remove, push, update } from 'firebase/database';
import { database } from '@/config/firebase';
import { MealPlan } from '@/types';

export const getAllMealPlans = async (): Promise<Record<string, MealPlan>> => {
  const plansRef = ref(database, 'mealPlans');
  const snapshot = await get(plansRef);

  if (!snapshot.exists()) {
    return {};
  }

  return snapshot.val() as Record<string, MealPlan>;
};

export const getMealPlanByDate = async (date: string): Promise<MealPlan | null> => {
  const planRef = ref(database, `mealPlans/${date}`);
  const snapshot = await get(planRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val() as MealPlan;
};

export const saveMealPlan = async (date: string, plan: MealPlan): Promise<void> => {
  const planRef = ref(database, `mealPlans/${date}`);
  await set(planRef, plan);
};

export const deleteMealPlan = async (date: string): Promise<void> => {
  const planRef = ref(database, `mealPlans/${date}`);
  await remove(planRef);
};

export const createMealPlan = async (plan: Omit<MealPlan, 'createdAt'>): Promise<string> => {
  const plansRef = ref(database, 'mealPlans');
  const newPlanRef = push(plansRef);

  const mealPlan: MealPlan = {
    ...plan,
    createdAt: new Date().toISOString(),
  };

  await set(newPlanRef, mealPlan);
  return newPlanRef.key!;
};

export const getMealPlanById = async (planId: string): Promise<MealPlan | null> => {
  const planRef = ref(database, `mealPlans/${planId}`);
  const snapshot = await get(planRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val() as MealPlan;
};

export const getMealPlansBySchoolId = async (schoolId: string): Promise<Record<string, MealPlan>> => {
  const plans = await getAllMealPlans();
  const schoolPlans: Record<string, MealPlan> = {};

  Object.entries(plans).forEach(([id, plan]) => {
    if (plan.schoolId === schoolId) {
      schoolPlans[id] = plan;
    }
  });

  return schoolPlans;
};

export const updateMealPlan = async (planId: string, updates: Partial<MealPlan>): Promise<void> => {
  const planRef = ref(database, `mealPlans/${planId}`);
  await update(planRef, updates);
};

export const approveMealPlan = async (planId: string): Promise<void> => {
  const planRef = ref(database, `mealPlans/${planId}`);
  
  // First get the meal plan to extract data for meal stock
  const planSnapshot = await get(planRef);
  if (!planSnapshot.exists()) {
    throw new Error('Meal plan not found');
  }
  
  const mealPlan = planSnapshot.val() as MealPlan;
  
  // Update the meal plan status
  await update(planRef, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
  });

  // Auto-populate meal stock for all classes in the school when meal plan is approved
  try {
    const { getClassesBySchoolId } = await import('./classService');
    const { addMealToClassStock } = await import('./mealStockService');
    
    const classes = await getClassesBySchoolId(mealPlan.schoolId);
    const dateId = new Date().toISOString().split('T')[0]; // Use current date as meal ID
    
    // Add each meal from the plan to all classes in the school
    for (const [classId, classInfo] of Object.entries(classes)) {
      for (let i = 0; i < mealPlan.menu.length; i++) {
        const meal = mealPlan.menu[i];
        const mealId = `${dateId}_${planId}_meal${i}`;
        
        await addMealToClassStock(mealPlan.schoolId, classId, mealId, {
          mealName: meal.mealName,
          quantity: meal.quantity,
          coverage: classInfo.numberOfStudents,
          unit: 'servings',
          claimedAt: new Date().toISOString(),
          claimedBy: 'Auto-approved Meal Plan',
          donorName: 'School Meal Plan',
          // Don't include donorId if undefined - Firebase doesn't allow undefined values
          description: `From approved meal plan: ${meal.ingredients.join(', ')}`,
        });
      }
    }
    
    console.log(`Meal plan ${planId} approved and added to meal stock for all classes`);
  } catch (error) {
    console.error('Error adding approved meal plan to stock:', error);
    // Don't throw - meal plan approval should succeed even if stock update fails
  }
};

export const deleteMealPlanById = async (planId: string): Promise<void> => {
  const planRef = ref(database, `mealPlans/${planId}`);
  await remove(planRef);
};