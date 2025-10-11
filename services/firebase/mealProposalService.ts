import { ref, get, push, set, update, remove } from 'firebase/database';
import { database } from '@/config/firebase';
import { MealProposal } from '@/types';

export const getMealProposalsByClassId = async (classId: string): Promise<Record<string, MealProposal>> => {
  const proposalsRef = ref(database, `mealProposals/${classId}`);
  const snapshot = await get(proposalsRef);

  if (!snapshot.exists()) return {};
  return snapshot.val() as Record<string, MealProposal>;
};

export const getAllMealProposals = async (): Promise<Record<string, Record<string, MealProposal>>> => {
  const proposalsRef = ref(database, 'mealProposals');
  const snapshot = await get(proposalsRef);

  if (!snapshot.exists()) return {};
  return snapshot.val() as Record<string, Record<string, MealProposal>>;
};

export const createMealProposal = async (classId: string, proposal: Omit<MealProposal, 'createdAt'>): Promise<string> => {
  try {
    const proposalsRef = ref(database, `mealProposals/${classId}`);
    const newRef = push(proposalsRef);

    const payload = {
      ...proposal,
      classId,
      createdAt: new Date().toISOString()
    };

    await set(newRef, JSON.parse(JSON.stringify(payload)));
    return newRef.key!;
  } catch (err) {
    console.error('mealProposalService.createMealProposal error:', err);
    throw err;
  }
};

export const updateMealProposal = async (classId: string, proposalId: string, updates: Partial<MealProposal>): Promise<void> => {
  try {
    const proposalRef = ref(database, `mealProposals/${classId}/${proposalId}`);
    const payload = JSON.parse(JSON.stringify(updates));
    await update(proposalRef, payload);
  } catch (err) {
    console.error('mealProposalService.updateMealProposal error:', err);
    throw err;
  }
};

export const deleteMealProposal = async (classId: string, proposalId: string): Promise<void> => {
  try {
    const proposalRef = ref(database, `mealProposals/${classId}/${proposalId}`);
    await remove(proposalRef);
  } catch (err) {
    console.error('mealProposalService.deleteMealProposal error:', err);
    throw err;
  }
};
