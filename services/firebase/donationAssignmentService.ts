import { ref, get, set, push, update, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import { DonationAssignment } from '@/types';
import { updatePublishedDonation, getPublishedDonationById } from './publishedDonationService';
import { createReadyDonation } from './readyDonationService';
import { getClassById } from './classService';

export const createDonationAssignmentDirect = async (
  assignmentData: Omit<DonationAssignment, 'createdAt' | 'status'>
): Promise<string> => {
  console.log('[DIRECT] createDonationAssignment called with:', assignmentData);

  try {
    const assignmentsRef = ref(database, 'donationAssignments');
    const newAssignmentRef = push(assignmentsRef);
    const assignmentId = newAssignmentRef.key;

    if (!assignmentId) {
      throw new Error('Failed to generate assignment ID');
    }

    const assignment: DonationAssignment = {
      ...assignmentData,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    console.log('[DIRECT] Saving assignment directly to path:', `donationAssignments/${assignmentId}`);
    console.log('[DIRECT] Assignment data:', JSON.stringify(assignment, null, 2));

    await set(newAssignmentRef, assignment);

    console.log('[DIRECT] Verifying save...');
    const verifySnapshot = await get(newAssignmentRef);
    if (verifySnapshot.exists()) {
      console.log('[DIRECT] ✓ Assignment successfully saved and verified!');
    } else {
      console.error('[DIRECT] ✗ Assignment was not saved!');
      throw new Error('Assignment save verification failed');
    }

    console.log('[DIRECT] Fetching published donation...');
    const donation = await getPublishedDonationById(assignmentData.publishedDonationId);

    if (donation) {
      console.log('[DIRECT] Published donation found, updating remaining students...');
      const remainingStudents = donation.remainingStudents ?? donation.numberOfStudents ?? 0;
      const newRemainingStudents = Math.max(0, remainingStudents - assignmentData.numberOfStudents);

      await updatePublishedDonation(assignmentData.publishedDonationId, {
        remainingStudents: newRemainingStudents,
        status: newRemainingStudents === 0 ? 'reserved' : 'available',
      });
      console.log('[DIRECT] ✓ Published donation updated');

      console.log('[DIRECT] Creating ready donation...');
      const classData = await getClassById(assignmentData.schoolId, assignmentData.classId);

      const readyDonationData = {
        publishedDonationId: assignmentData.publishedDonationId,
        donorId: assignmentData.donorId,
        donorName: assignmentData.donorName,
        principalId: assignmentData.principalId,
        principalName: assignmentData.principalName,
        schoolId: assignmentData.schoolId,
        schoolName: assignmentData.schoolName,
        classId: assignmentData.classId,
        className: classData?.className || assignmentData.className,
        itemName: assignmentData.itemName,
        description: donation.description,
        quantity: assignmentData.quantity,
        unit: assignmentData.unit,
        category: donation.category,
        location: donation.location,
        numberOfStudents: assignmentData.numberOfStudents,
      };

      await createReadyDonation(readyDonationData);
      console.log('[DIRECT] ✓ Ready donation created');
    } else {
      console.warn('[DIRECT] Published donation not found, skipping updates');
    }

    return assignmentId;
  } catch (error) {
    console.error('[DIRECT] Error in createDonationAssignmentDirect:', error);
    if (error instanceof Error) {
      console.error('[DIRECT] Error message:', error.message);
      console.error('[DIRECT] Error stack:', error.stack);
    }
    throw error;
  }
};

export const createDonationAssignment = async (
  assignmentData: Omit<DonationAssignment, 'createdAt' | 'status'>
): Promise<string> => {
  console.log('createDonationAssignment called with:', assignmentData);

  const donation = await getPublishedDonationById(assignmentData.publishedDonationId);
  console.log('Published donation fetched:', donation);

  if (!donation) {
    throw new Error('Donation not found');
  }

  const remainingStudents = donation.remainingStudents ?? donation.numberOfStudents ?? 0;
  console.log('Remaining students:', remainingStudents);

  if (assignmentData.numberOfStudents > remainingStudents) {
    throw new Error(`Only ${remainingStudents} students remaining for this donation`);
  }

  const assignmentsRef = ref(database, 'donationAssignments');
  const newAssignmentRef = push(assignmentsRef);

  const assignment: DonationAssignment = {
    ...assignmentData,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  console.log('Saving assignment to Firebase:', assignment);
  await set(newAssignmentRef, assignment);
  console.log('Assignment saved with key:', newAssignmentRef.key);

  const newRemainingStudents = remainingStudents - assignmentData.numberOfStudents;
  console.log('Updating published donation, new remaining:', newRemainingStudents);
  await updatePublishedDonation(assignmentData.publishedDonationId, {
    remainingStudents: newRemainingStudents,
    status: newRemainingStudents === 0 ? 'reserved' : 'available',
  });

  console.log('Creating ready donation...');
  const classData = await getClassById(assignmentData.schoolId, assignmentData.classId);

  const readyDonationData = {
    publishedDonationId: assignmentData.publishedDonationId,
    donorId: assignmentData.donorId,
    donorName: assignmentData.donorName,
    principalId: assignmentData.principalId,
    principalName: assignmentData.principalName,
    schoolId: assignmentData.schoolId,
    schoolName: assignmentData.schoolName,
    classId: assignmentData.classId,
    className: classData?.className || assignmentData.className,
    itemName: assignmentData.itemName,
    description: donation.description,
    quantity: assignmentData.quantity,
    unit: assignmentData.unit,
    category: donation.category,
    location: donation.location,
    numberOfStudents: assignmentData.numberOfStudents,
  };
  console.log('Ready donation data:', readyDonationData);

  await createReadyDonation(readyDonationData);
  console.log('Ready donation created successfully');

  return newAssignmentRef.key!;
};

export const getDonationAssignmentById = async (
  assignmentId: string
): Promise<DonationAssignment | null> => {
  const assignmentRef = ref(database, `donationAssignments/${assignmentId}`);
  const snapshot = await get(assignmentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val() as DonationAssignment;
};

export const getAllDonationAssignments = async (): Promise<Record<string, DonationAssignment>> => {
  const assignmentsRef = ref(database, 'donationAssignments');
  const snapshot = await get(assignmentsRef);

  if (!snapshot.exists()) {
    return {};
  }

  return snapshot.val() as Record<string, DonationAssignment>;
};

export const getAssignmentsByDonorId = async (
  donorId: string
): Promise<Record<string, DonationAssignment>> => {
  const assignments = await getAllDonationAssignments();
  const donorAssignments: Record<string, DonationAssignment> = {};

  Object.entries(assignments).forEach(([id, assignment]) => {
    if (assignment.donorId === donorId) {
      donorAssignments[id] = assignment;
    }
  });

  return donorAssignments;
};

export const getAssignmentsBySchoolId = async (
  schoolId: string
): Promise<Record<string, DonationAssignment>> => {
  const assignments = await getAllDonationAssignments();
  const schoolAssignments: Record<string, DonationAssignment> = {};

  Object.entries(assignments).forEach(([id, assignment]) => {
    if (assignment.schoolId === schoolId) {
      schoolAssignments[id] = assignment;
    }
  });

  return schoolAssignments;
};

export const getAssignmentsByTeacherId = async (
  teacherId: string
): Promise<Record<string, DonationAssignment>> => {
  const assignments = await getAllDonationAssignments();
  const teacherAssignments: Record<string, DonationAssignment> = {};

  Object.entries(assignments).forEach(([id, assignment]) => {
    if (assignment.teacherId === teacherId) {
      teacherAssignments[id] = assignment;
    }
  });

  return teacherAssignments;
};

export const updateDonationAssignment = async (
  assignmentId: string,
  updates: Partial<DonationAssignment>
): Promise<void> => {
  const assignmentRef = ref(database, `donationAssignments/${assignmentId}`);
  await update(assignmentRef, updates);
};

export const acceptDonationAssignment = async (assignmentId: string): Promise<void> => {
  await updateDonationAssignment(assignmentId, {
    status: 'accepted',
    acceptedAt: new Date().toISOString(),
  });
};

export const dispatchDonationAssignment = async (
  assignmentId: string,
  notes?: string
): Promise<void> => {
  const updates: Partial<DonationAssignment> = {
    status: 'dispatched',
    dispatchedAt: new Date().toISOString(),
  };

  if (notes) {
    updates.notes = notes;
  }

  await updateDonationAssignment(assignmentId, updates);
};

export const claimDonationAssignment = async (
  assignmentId: string,
  teacherId: string,
  teacherName: string
): Promise<void> => {
  await updateDonationAssignment(assignmentId, {
    status: 'claimed',
    claimedAt: new Date().toISOString(),
    teacherId,
    teacherName,
  });
};

export const serveDonationAssignment = async (assignmentId: string): Promise<void> => {
  await updateDonationAssignment(assignmentId, {
    status: 'served',
    servedAt: new Date().toISOString(),
  });
};

export const rejectDonationAssignment = async (
  assignmentId: string,
  notes?: string
): Promise<void> => {
  const assignment = await getDonationAssignmentById(assignmentId);

  if (!assignment) {
    throw new Error('Assignment not found');
  }

  const updates: Partial<DonationAssignment> = {
    status: 'rejected',
  };

  if (notes) {
    updates.notes = notes;
  }

  await updateDonationAssignment(assignmentId, updates);

  const donation = await getPublishedDonationById(assignment.publishedDonationId);
  if (donation) {
    const currentRemaining = donation.remainingStudents ?? donation.numberOfStudents ?? 0;
    const newRemaining = currentRemaining + assignment.numberOfStudents;
    await updatePublishedDonation(assignment.publishedDonationId, {
      remainingStudents: newRemaining,
      status: 'available',
    });
  }
};

export const listenToDonorAssignments = (
  donorId: string,
  callback: (assignments: Record<string, DonationAssignment>) => void
): (() => void) => {
  const assignmentsRef = ref(database, 'donationAssignments');

  const unsubscribe = onValue(assignmentsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }

    const allAssignments = snapshot.val() as Record<string, DonationAssignment>;
    const donorAssignments: Record<string, DonationAssignment> = {};

    Object.entries(allAssignments).forEach(([id, assignment]) => {
      if (assignment.donorId === donorId) {
        donorAssignments[id] = assignment;
      }
    });

    callback(donorAssignments);
  });

  return unsubscribe;
};

export const listenToSchoolAssignments = (
  schoolId: string,
  callback: (assignments: Record<string, DonationAssignment>) => void
): (() => void) => {
  const assignmentsRef = ref(database, 'donationAssignments');

  const unsubscribe = onValue(assignmentsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }

    const allAssignments = snapshot.val() as Record<string, DonationAssignment>;
    const schoolAssignments: Record<string, DonationAssignment> = {};

    Object.entries(allAssignments).forEach(([id, assignment]) => {
      if (assignment.schoolId === schoolId) {
        schoolAssignments[id] = assignment;
      }
    });

    callback(schoolAssignments);
  });

  return unsubscribe;
};

export const deleteDonationAssignment = async (assignmentId: string): Promise<void> => {
  const assignmentRef = ref(database, `donationAssignments/${assignmentId}`);
  await set(assignmentRef, null);
};
