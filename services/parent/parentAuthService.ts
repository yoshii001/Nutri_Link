import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStudentByAccessCode } from '@/services/firebase/studentService';
import { validateAccessCode } from '@/utils/accessCode';
import { StudentProfile } from '@/types';

export interface ParentSession {
  accessCode: string;
  teacherId: string;
  studentKey: string;
  student: StudentProfile;
  loginTime: string;
}

export const loginWithAccessCode = async (accessCode: string): Promise<ParentSession | null> => {
  const formattedCode = accessCode.trim();

  if (!validateAccessCode(formattedCode)) {
    throw new Error('Invalid code format. Code must be 7 letters followed by a symbol ($, @, #, or *)');
  }

  const result = await getStudentByAccessCode(formattedCode);

  if (!result) {
    throw new Error('Invalid access code. Please check with your teacher.');
  }

  const session: ParentSession = {
    accessCode: formattedCode,
    teacherId: result.teacherId,
    studentKey: result.studentKey,
    student: result.student,
    loginTime: new Date().toISOString(),
  };

  await AsyncStorage.setItem('parentAccessCode', formattedCode);
  await AsyncStorage.setItem('parentSession', JSON.stringify(session));

  return session;
};

export const getParentSession = async (): Promise<ParentSession | null> => {
  try {
    const sessionData = await AsyncStorage.getItem('parentSession');
    if (!sessionData) return null;

    return JSON.parse(sessionData) as ParentSession;
  } catch (error) {
    console.error('Error getting parent session:', error);
    return null;
  }
};

export const logoutParent = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('parentAccessCode');
    await AsyncStorage.removeItem('parentSession');
  } catch (error) {
    console.error('Error logging out parent:', error);
    throw error;
  }
};

export const isParentLoggedIn = async (): Promise<boolean> => {
  try {
    const accessCode = await AsyncStorage.getItem('parentAccessCode');
    return !!accessCode;
  } catch (error) {
    console.error('Error checking parent login status:', error);
    return false;
  }
};
