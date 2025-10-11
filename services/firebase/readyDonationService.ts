import { ref, get, set, push, update, onValue, off } from 'firebase/database';
import { database } from '@/config/firebase';

export interface ReadyDonation {
  publishedDonationId: string;
  donorId: string;
  donorName: string;
  principalId: string;
  principalName?: string;
  schoolId?: string;
  schoolName?: string;
  classId: string;
  className?: string;
  itemName?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  category?: string;
  location?: string;
  numberOfStudents: number;
  status: 'pending' | 'approved' | 'completed';
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
  teacherId?: string;
  teacherName?: string;
  notes?: string;
}

export const createReadyDonation = async (
  donationData: Omit<ReadyDonation, 'createdAt' | 'status'>
): Promise<string> => {
  console.log('createReadyDonation called with:', donationData);

  const readyDonationsRef = ref(database, 'readyDonations');
  const newDonationRef = push(readyDonationsRef);

  const readyDonation: ReadyDonation = {
    ...donationData,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  console.log('Saving ready donation to Firebase:', readyDonation);
  await set(newDonationRef, readyDonation);
  console.log('Ready donation saved with key:', newDonationRef.key);

  return newDonationRef.key!;
};

export const getReadyDonationById = async (
  donationId: string
): Promise<ReadyDonation | null> => {
  const donationRef = ref(database, `readyDonations/${donationId}`);
  const snapshot = await get(donationRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val() as ReadyDonation;
};

export const getAllReadyDonations = async (): Promise<Record<string, ReadyDonation>> => {
  const donationsRef = ref(database, 'readyDonations');
  const snapshot = await get(donationsRef);

  if (!snapshot.exists()) {
    return {};
  }

  return snapshot.val() as Record<string, ReadyDonation>;
};

export const getReadyDonationsByPrincipalId = async (
  principalId: string
): Promise<Record<string, ReadyDonation>> => {
  const donations = await getAllReadyDonations();
  const principalDonations: Record<string, ReadyDonation> = {};

  Object.entries(donations).forEach(([id, donation]) => {
    if (donation.principalId === principalId) {
      principalDonations[id] = donation;
    }
  });

  return principalDonations;
};

export const getReadyDonationsByClassId = async (
  classId: string
): Promise<Record<string, ReadyDonation>> => {
  const donations = await getAllReadyDonations();
  const classDonations: Record<string, ReadyDonation> = {};

  Object.entries(donations).forEach(([id, donation]) => {
    if (donation.classId === classId) {
      classDonations[id] = donation;
    }
  });

  return classDonations;
};

export const getReadyDonationsByTeacherId = async (
  teacherId: string
): Promise<Record<string, ReadyDonation>> => {
  const donations = await getAllReadyDonations();
  const teacherDonations: Record<string, ReadyDonation> = {};

  Object.entries(donations).forEach(([id, donation]) => {
    if (donation.teacherId === teacherId) {
      teacherDonations[id] = donation;
    }
  });

  return teacherDonations;
};

export const getPendingReadyDonationsByPrincipalId = async (
  principalId: string
): Promise<Record<string, ReadyDonation>> => {
  const donations = await getReadyDonationsByPrincipalId(principalId);
  const pendingDonations: Record<string, ReadyDonation> = {};

  Object.entries(donations).forEach(([id, donation]) => {
    if (donation.status === 'pending') {
      pendingDonations[id] = donation;
    }
  });

  return pendingDonations;
};

export const updateReadyDonation = async (
  donationId: string,
  updates: Partial<ReadyDonation>
): Promise<void> => {
  console.log('updateReadyDonation called with:', { donationId, updates });
  const donationRef = ref(database, `readyDonations/${donationId}`);
  await update(donationRef, updates);
  console.log('Update completed successfully');
};

export const approveDonationRequest = async (
  donationId: string
): Promise<void> => {
  console.log('approveDonationRequest called for ID:', donationId);
  try {
    const donationRef = ref(database, `readyDonations/${donationId}`);
    const snapshot = await get(donationRef);

    if (!snapshot.exists()) {
      throw new Error('Donation not found');
    }

    const readyDonation = snapshot.val() as ReadyDonation;
    console.log('Current donation data:', readyDonation);

    await update(donationRef, {
      status: 'approved',
      approvedAt: new Date().toISOString(),
    });

    console.log('Donation status updated to approved');

    if (readyDonation.publishedDonationId) {
      const publishedDonationRef = ref(database, `publishedDonations/${readyDonation.publishedDonationId}`);
      const publishedSnapshot = await get(publishedDonationRef);

      if (publishedSnapshot.exists()) {
        const publishedDonation = publishedSnapshot.val();
        const currentRemaining = publishedDonation.remainingStudents || publishedDonation.numberOfStudents || 0;
        const newRemaining = Math.max(0, currentRemaining - readyDonation.numberOfStudents);

        await update(publishedDonationRef, {
          remainingStudents: newRemaining,
        });

        console.log(`Updated remainingStudents from ${currentRemaining} to ${newRemaining}`);
      }
    }

    const updatedSnapshot = await get(donationRef);
    console.log('Updated donation data:', updatedSnapshot.val());
  } catch (error) {
    console.error('Error in approveDonationRequest:', error);
    throw error;
  }
};

export const rejectDonationRequest = async (
  donationId: string,
  notes?: string
): Promise<void> => {
  const donation = await getReadyDonationById(donationId);
  if (!donation) {
    throw new Error('Ready donation not found');
  }

  await deleteReadyDonation(donationId);
};

export const listenToReadyDonationsByPrincipal = (
  principalId: string,
  callback: (donations: Record<string, ReadyDonation>) => void
): (() => void) => {
  const donationsRef = ref(database, 'readyDonations');

  const listener = onValue(donationsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }

    const allDonations = snapshot.val() as Record<string, ReadyDonation>;
    const principalDonations: Record<string, ReadyDonation> = {};

    Object.entries(allDonations).forEach(([id, donation]) => {
      if (donation.principalId === principalId) {
        principalDonations[id] = donation;
      }
    });

    callback(principalDonations);
  });

  return () => off(donationsRef, 'value', listener);
};

export const deleteReadyDonation = async (donationId: string): Promise<void> => {
  const donationRef = ref(database, `readyDonations/${donationId}`);
  await set(donationRef, null);
};

export const getReadyDonationsByDonorId = async (
  donorId: string
): Promise<Record<string, ReadyDonation>> => {
  const donations = await getAllReadyDonations();
  const donorDonations: Record<string, ReadyDonation> = {};

  Object.entries(donations).forEach(([id, donation]) => {
    if (donation.donorId === donorId) {
      donorDonations[id] = donation;
    }
  });

  return donorDonations;
};

export const getPendingReadyDonationsByDonorId = async (
  donorId: string
): Promise<Record<string, ReadyDonation>> => {
  const donations = await getReadyDonationsByDonorId(donorId);
  const pendingDonations: Record<string, ReadyDonation> = {};

  Object.entries(donations).forEach(([id, donation]) => {
    if (donation.status === 'pending') {
      pendingDonations[id] = donation;
    }
  });

  return pendingDonations;
};

export const listenToReadyDonationsByDonor = (
  donorId: string,
  callback: (donations: Record<string, ReadyDonation>) => void
): (() => void) => {
  const donationsRef = ref(database, 'readyDonations');

  const listener = onValue(donationsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }

    const allDonations = snapshot.val() as Record<string, ReadyDonation>;
    const donorDonations: Record<string, ReadyDonation> = {};

    Object.entries(allDonations).forEach(([id, donation]) => {
      if (donation.donorId === donorId) {
        donorDonations[id] = donation;
      }
    });

    callback(donorDonations);
  });

  return () => off(donationsRef, 'value', listener);
};

export const listenToReadyDonationsBySchool = (
  schoolId: string,
  callback: (donations: Record<string, ReadyDonation>) => void
): (() => void) => {
  const donationsRef = ref(database, 'readyDonations');

  const listener = onValue(donationsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }

    const allDonations = snapshot.val() as Record<string, ReadyDonation>;
    const schoolDonations: Record<string, ReadyDonation> = {};

    Object.entries(allDonations).forEach(([id, donation]) => {
      if (donation.schoolId === schoolId) {
        schoolDonations[id] = donation;
      }
    });

    callback(schoolDonations);
  });

  return () => off(donationsRef, 'value', listener);
};

export const claimDonationByTeacher = async (
  donationId: string,
  teacherId: string,
  teacherName: string
): Promise<void> => {
  await updateReadyDonation(donationId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    teacherId,
    teacherName,
  });
};
