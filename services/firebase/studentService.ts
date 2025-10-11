import { ref, get, push, set, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '@/config/firebase';
import { StudentProfile } from '@/types';
import { generateAccessCode } from '@/utils/accessCode';
import { updateClassStudentCount } from './classService';

export const getStudentsByTeacher = async (teacherId: string): Promise<Record<string, StudentProfile>> => {
  const studentsRef = ref(database, `students/${teacherId}`);
  const snapshot = await get(studentsRef);

  if (!snapshot.exists()) return {};
  return snapshot.val() as Record<string, StudentProfile>;
};

export const addStudent = async (teacherId: string, student: StudentProfile): Promise<string> => {
  try {
    const studentsRef = ref(database, `students/${teacherId}`);
    const newRef = push(studentsRef);

    let parentAccessToken = generateAccessCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const existingStudent = await getStudentByAccessCode(parentAccessToken);
      if (!existingStudent) {
        isUnique = true;
      } else {
        parentAccessToken = generateAccessCode();
        attempts++;
      }
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique access code');
    }

    const raw = {
      ...student,
      teacherId,
      parentAccessToken,
      allergies: student.allergies || 'none',
      mealFeedbacks: student.mealFeedbacks || null,
      createdAt: new Date().toISOString()
    } as any;
    const payload = JSON.parse(JSON.stringify(raw));
    await set(newRef, payload);
    return newRef.key!;
  } catch (err) {
    console.error('studentService.addStudent error:', err, { teacherId, student });
    throw err;
  }
};

export const updateStudent = async (teacherId: string, studentId: string, updates: Partial<StudentProfile>): Promise<void> => {
  const studentRef = ref(database, `students/${teacherId}/${studentId}`);
  try {
    const payload = JSON.parse(JSON.stringify(updates));

    const oldSnapshot = await get(studentRef);
    const oldStudent = oldSnapshot.val() as StudentProfile;

    await update(studentRef, payload);

    if (updates.classId && oldStudent.classId !== updates.classId) {
      if (oldStudent.classId) {
        const oldClassStudents = await getStudentsByClassId(oldStudent.classId);
        const oldSchoolId = oldStudent.teacherId;
        if (oldSchoolId) {
          await updateClassStudentCount(oldSchoolId, oldStudent.classId, Object.keys(oldClassStudents).length - 1);
        }
      }

      if (updates.classId) {
        const newClassStudents = await getStudentsByClassId(updates.classId);
        const newSchoolId = teacherId;
        if (newSchoolId) {
          await updateClassStudentCount(newSchoolId, updates.classId, Object.keys(newClassStudents).length + 1);
        }
      }
    }
  } catch (err) {
    console.error('studentService.updateStudent error:', err, { teacherId, studentId, updates });
    throw err;
  }
};

export const deleteStudent = async (teacherId: string, studentId: string): Promise<void> => {
  try {
    const studentRef = ref(database, `students/${teacherId}/${studentId}`);
    const snapshot = await get(studentRef);
    const student = snapshot.val() as StudentProfile;

    await remove(studentRef);

    if (student?.classId) {
      const classStudents = await getStudentsByClassId(student.classId);
      await updateClassStudentCount(teacherId, student.classId, Object.keys(classStudents).length - 1);
    }
  } catch (err) {
    console.error('studentService.deleteStudent error:', err, { teacherId, studentId });
    throw err;
  }
};

export const getStudentByIdAndToken = async (studentRegId: string, accessToken: string): Promise<{ teacherId: string; studentKey: string; student: StudentProfile } | null> => {
  try {
    const allTeachersRef = ref(database, 'students');
    const snapshot = await get(allTeachersRef);

    if (!snapshot.exists()) return null;

    const allTeachers = snapshot.val();

    for (const [teacherId, students] of Object.entries(allTeachers)) {
      for (const [studentKey, student] of Object.entries(students as Record<string, StudentProfile>)) {
        if (student.studentId === studentRegId && student.parentAccessToken === accessToken) {
          return { teacherId, studentKey, student };
        }
      }
    }

    return null;
  } catch (err) {
    console.error('studentService.getStudentByIdAndToken error:', err);
    throw err;
  }
};

export const updateStudentAllergiesAndFeedback = async (
  teacherId: string,
  studentKey: string,
  allergies?: string,
  mealFeedbacks?: string
): Promise<void> => {
  try {
    const studentRef = ref(database, `students/${teacherId}/${studentKey}`);
    const updates: any = {};

    if (allergies !== undefined) updates.allergies = allergies;
    if (mealFeedbacks !== undefined) updates.mealFeedbacks = mealFeedbacks;

    const payload = JSON.parse(JSON.stringify(updates));
    await update(studentRef, payload);
  } catch (err) {
    console.error('studentService.updateStudentAllergiesAndFeedback error:', err);
    throw err;
  }
};

export const getStudentsByClassId = async (classId: string): Promise<Record<string, StudentProfile>> => {
  try {
    const allStudentsRef = ref(database, 'students');
    const snapshot = await get(allStudentsRef);

    if (!snapshot.exists()) return {};

    const allTeachers = snapshot.val();
    const classStudents: Record<string, StudentProfile> = {};

    for (const [teacherId, students] of Object.entries(allTeachers)) {
      for (const [studentKey, student] of Object.entries(students as Record<string, StudentProfile>)) {
        if (student.classId === classId) {
          classStudents[studentKey] = student;
        }
      }
    }

    return classStudents;
  } catch (err) {
    console.error('studentService.getStudentsByClassId error:', err);
    throw err;
  }
};

export const getStudentByAccessCode = async (accessCode: string): Promise<{ teacherId: string; studentKey: string; student: StudentProfile } | null> => {
  try {
    const allTeachersRef = ref(database, 'students');
    const snapshot = await get(allTeachersRef);

    if (!snapshot.exists()) return null;

    const allTeachers = snapshot.val();

    for (const [teacherId, students] of Object.entries(allTeachers)) {
      for (const [studentKey, student] of Object.entries(students as Record<string, StudentProfile>)) {
        if (student.parentAccessToken === accessCode) {
          return { teacherId, studentKey, student };
        }
      }
    }

    return null;
  } catch (err) {
    console.error('studentService.getStudentByAccessCode error:', err);
    throw err;
  }
};

export const regenerateAccessCode = async (teacherId: string, studentId: string): Promise<string> => {
  try {
    let parentAccessToken = generateAccessCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const existingStudent = await getStudentByAccessCode(parentAccessToken);
      if (!existingStudent) {
        isUnique = true;
      } else {
        parentAccessToken = generateAccessCode();
        attempts++;
      }
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique access code');
    }

    await updateStudent(teacherId, studentId, { parentAccessToken });
    return parentAccessToken;
  } catch (err) {
    console.error('studentService.regenerateAccessCode error:', err, { teacherId, studentId });
    throw err;
  }
};
