import { ref, get, set, push, update, remove } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { database, auth } from '@/config/firebase';
import { Teacher, User } from '@/types';

export const addTeacher = async (
  teacherData: Omit<Teacher, 'createdAt'>,
  password: string
): Promise<string> => {
  // Get current user to restore auth state after creating teacher
  const currentUser = auth.currentUser;

  try {
    // Create Firebase auth account for the teacher
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      teacherData.email,
      password
    );
    const teacherUid = userCredential.user.uid;

    // Create user record in users table
    const userData: User = {
      email: teacherData.email,
      name: teacherData.name,
      role: 'teacher',
      createdAt: new Date().toISOString(),
    };
    await set(ref(database, `users/${teacherUid}`), userData);

    // Create teacher record in teachers table
    const teachersRef = ref(database, 'teachers');
    const newTeacherRef = push(teachersRef);
    const teacher: Teacher = {
      ...teacherData,
      userId: teacherUid,
      createdAt: new Date().toISOString(),
    };
    await set(newTeacherRef, teacher);

    // Sign out the newly created teacher account and restore current user
    if (currentUser) {
      // Force restore the current user session
      await auth.updateCurrentUser(currentUser);
    }

    return newTeacherRef.key!;
  } catch (error) {
    // If anything fails, try to restore current user
    if (currentUser) {
      await auth.updateCurrentUser(currentUser);
    }
    throw error;
  }
};

export const getTeacherById = async (teacherId: string): Promise<Teacher | null> => {
  const teacherRef = ref(database, `teachers/${teacherId}`);
  const snapshot = await get(teacherRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val() as Teacher;
};

export const getAllTeachers = async (): Promise<Record<string, Teacher>> => {
  const teachersRef = ref(database, 'teachers');
  const snapshot = await get(teachersRef);

  if (!snapshot.exists()) {
    return {};
  }

  return snapshot.val() as Record<string, Teacher>;
};

export const getTeachersBySchoolId = async (schoolId: string): Promise<Record<string, Teacher>> => {
  const teachers = await getAllTeachers();
  const schoolTeachers: Record<string, Teacher> = {};

  Object.entries(teachers).forEach(([id, teacher]) => {
    if (teacher.schoolId === schoolId) {
      schoolTeachers[id] = teacher;
    }
  });

  return schoolTeachers;
};

export const updateTeacher = async (teacherId: string, updates: Partial<Teacher>): Promise<void> => {
  const teacherRef = ref(database, `teachers/${teacherId}`);
  await update(teacherRef, updates);
};

export const deactivateTeacher = async (teacherId: string): Promise<void> => {
  const teacherRef = ref(database, `teachers/${teacherId}`);
  await update(teacherRef, { isActive: false });
};

export const activateTeacher = async (teacherId: string): Promise<void> => {
  const teacherRef = ref(database, `teachers/${teacherId}`);
  await update(teacherRef, { isActive: true });
};

export const deleteTeacher = async (teacherId: string): Promise<void> => {
  const teacherRef = ref(database, `teachers/${teacherId}`);
  await remove(teacherRef);
};

export const getTeacherByUserId = async (userId: string): Promise<{ id: string; teacher: Teacher } | null> => {
  const teachers = await getAllTeachers();

  for (const [id, teacher] of Object.entries(teachers)) {
    if (teacher.userId === userId) {
      return { id, teacher };
    }
  }

  return null;
};
