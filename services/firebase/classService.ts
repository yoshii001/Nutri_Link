import { ref, get, push, set, update, remove, onValue, off } from 'firebase/database';
import { database } from '@/config/firebase';
import { ClassInfo } from '@/types';

export const getClassesBySchoolId = async (schoolId: string): Promise<Record<string, ClassInfo>> => {
  const classesRef = ref(database, `classes/${schoolId}`);
  const snapshot = await get(classesRef);

  if (!snapshot.exists()) return {};
  return snapshot.val() as Record<string, ClassInfo>;
};

export const getClassById = async (schoolId: string, classId: string): Promise<ClassInfo | null> => {
  const classRef = ref(database, `classes/${schoolId}/${classId}`);
  const snapshot = await get(classRef);

  if (!snapshot.exists()) return null;
  return snapshot.val() as ClassInfo;
};

export const createClass = async (schoolId: string, classData: Omit<ClassInfo, 'createdAt'>): Promise<string> => {
  try {
    const classesRef = ref(database, `classes/${schoolId}`);
    const newRef = push(classesRef);

    const payload = {
      ...classData,
      schoolId,
      createdAt: new Date().toISOString()
    };

    await set(newRef, JSON.parse(JSON.stringify(payload)));
    return newRef.key!;
  } catch (err) {
    console.error('classService.createClass error:', err);
    throw err;
  }
};

export const updateClass = async (schoolId: string, classId: string, updates: Partial<ClassInfo>): Promise<void> => {
  try {
    const classRef = ref(database, `classes/${schoolId}/${classId}`);
    const payload = JSON.parse(JSON.stringify(updates));
    await update(classRef, payload);
  } catch (err) {
    console.error('classService.updateClass error:', err);
    throw err;
  }
};

export const assignTeacherToClass = async (schoolId: string, classId: string, teacherId: string, teacherName: string): Promise<void> => {
  await updateClass(schoolId, classId, { teacherId, teacherName });
};

export const assignDonorToClass = async (schoolId: string, classId: string, donorId: string): Promise<void> => {
  try {
    const classData = await getClassById(schoolId, classId);
    if (!classData) throw new Error('Class not found');

    const currentDonors = classData.assignedDonors || [];
    if (!currentDonors.includes(donorId)) {
      currentDonors.push(donorId);
      await updateClass(schoolId, classId, { assignedDonors: currentDonors });
    }
  } catch (err) {
    console.error('classService.assignDonorToClass error:', err);
    throw err;
  }
};

export const deleteClass = async (schoolId: string, classId: string): Promise<void> => {
  try {
    const classRef = ref(database, `classes/${schoolId}/${classId}`);
    await remove(classRef);
  } catch (err) {
    console.error('classService.deleteClass error:', err);
    throw err;
  }
};

export const listenToClasses = (
  schoolId: string,
  callback: (classes: Record<string, ClassInfo>) => void
): (() => void) => {
  const classesRef = ref(database, `classes/${schoolId}`);

  const listener = onValue(classesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }

    callback(snapshot.val() as Record<string, ClassInfo>);
  });

  return () => off(classesRef, 'value', listener);
};

export const updateClassStudentCount = async (schoolId: string, classId: string, count: number): Promise<void> => {
  await updateClass(schoolId, classId, { numberOfStudents: count });
};

export const findSchoolIdByClassId = async (classId: string): Promise<string | null> => {
  try {
    const allClassesRef = ref(database, 'classes');
    const snapshot = await get(allClassesRef);

    if (!snapshot.exists()) return null;

    const allSchools = snapshot.val();

    for (const [schoolId, schoolClasses] of Object.entries(allSchools)) {
      if (typeof schoolClasses === 'object' && schoolClasses !== null) {
        if (classId in schoolClasses) {
          return schoolId;
        }
      }
    }

    return null;
  } catch (err) {
    console.error('classService.findSchoolIdByClassId error:', err);
    return null;
  }
};
