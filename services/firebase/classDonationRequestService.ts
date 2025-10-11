import { ref, get, push, set, update, query, orderByChild, equalTo, onValue, off } from 'firebase/database';
import { database } from '@/config/firebase';
import { ClassDonationRequest } from '@/types';

export const createClassDonationRequest = async (
  requestData: Omit<ClassDonationRequest, 'createdAt' | 'status'>
): Promise<string> => {
  const requestsRef = ref(database, 'classDonationRequests');
  const newRequestRef = push(requestsRef);

  const request: ClassDonationRequest = {
    ...requestData,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  await set(newRequestRef, request);
  return newRequestRef.key!;
};

export const getClassDonationRequestById = async (requestId: string): Promise<ClassDonationRequest | null> => {
  const requestRef = ref(database, `classDonationRequests/${requestId}`);
  const snapshot = await get(requestRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val() as ClassDonationRequest;
};

export const getAllClassDonationRequests = async (): Promise<Record<string, ClassDonationRequest>> => {
  const requestsRef = ref(database, 'classDonationRequests');
  const snapshot = await get(requestsRef);

  if (!snapshot.exists()) {
    return {};
  }

  return snapshot.val() as Record<string, ClassDonationRequest>;
};

export const getClassDonationRequestsByDonorId = async (donorId: string): Promise<Record<string, ClassDonationRequest>> => {
  const requests = await getAllClassDonationRequests();
  const donorRequests: Record<string, ClassDonationRequest> = {};

  Object.entries(requests).forEach(([id, request]) => {
    if (request.donorId === donorId) {
      donorRequests[id] = request;
    }
  });

  return donorRequests;
};

export const getClassDonationRequestsBySchoolId = async (schoolId: string): Promise<Record<string, ClassDonationRequest>> => {
  const requests = await getAllClassDonationRequests();
  const schoolRequests: Record<string, ClassDonationRequest> = {};

  Object.entries(requests).forEach(([id, request]) => {
    if (request.schoolId === schoolId) {
      schoolRequests[id] = request;
    }
  });

  return schoolRequests;
};

export const getPendingClassDonationRequestsByDonorId = async (donorId: string): Promise<Record<string, ClassDonationRequest>> => {
  const requests = await getClassDonationRequestsByDonorId(donorId);
  const pendingRequests: Record<string, ClassDonationRequest> = {};

  Object.entries(requests).forEach(([id, request]) => {
    if (request.status === 'pending') {
      pendingRequests[id] = request;
    }
  });

  return pendingRequests;
};

export const updateClassDonationRequest = async (
  requestId: string,
  updates: Partial<ClassDonationRequest>
): Promise<void> => {
  const requestRef = ref(database, `classDonationRequests/${requestId}`);
  await update(requestRef, updates);
};

export const approveClassDonationRequest = async (requestId: string): Promise<void> => {
  await updateClassDonationRequest(requestId, {
    status: 'approved',
    respondedAt: new Date().toISOString(),
  });
};

export const rejectClassDonationRequest = async (requestId: string): Promise<void> => {
  await updateClassDonationRequest(requestId, {
    status: 'rejected',
    respondedAt: new Date().toISOString(),
  });
};

export const listenToClassDonationRequests = (
  donorId: string,
  callback: (requests: Record<string, ClassDonationRequest>) => void
): (() => void) => {
  const requestsRef = ref(database, 'classDonationRequests');

  const listener = onValue(requestsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }

    const allRequests = snapshot.val() as Record<string, ClassDonationRequest>;
    const donorRequests: Record<string, ClassDonationRequest> = {};

    Object.entries(allRequests).forEach(([id, request]) => {
      if (request.donorId === donorId) {
        donorRequests[id] = request;
      }
    });

    callback(donorRequests);
  });

  return () => off(requestsRef, 'value', listener);
};

export const listenToSchoolClassDonationRequests = (
  schoolId: string,
  callback: (requests: Record<string, ClassDonationRequest>) => void
): (() => void) => {
  const requestsRef = ref(database, 'classDonationRequests');

  const listener = onValue(requestsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }

    const allRequests = snapshot.val() as Record<string, ClassDonationRequest>;
    const schoolRequests: Record<string, ClassDonationRequest> = {};

    Object.entries(allRequests).forEach(([id, request]) => {
      if (request.schoolId === schoolId) {
        schoolRequests[id] = request;
      }
    });

    callback(schoolRequests);
  });

  return () => off(requestsRef, 'value', listener);
};
