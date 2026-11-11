import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

const contract = contractFromJson<Contract>(contractJson);
const db = postgres({ contract, url: process.env['DATABASE_URL'] });

const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
const subjects = [
  'Mathematics',
  'Science',
  'English',
  'History',
  'Geography',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Art',
];

async function main() {
  // ADMIN
  await db.orm.public.Admin.create({ id: 'admin1', username: 'admin1' });
  await db.orm.public.Admin.create({ id: 'admin2', username: 'admin2' });

  // GRADE
  for (let i = 1; i <= 6; i++) {
    await db.orm.public.Grade.create({ level: i });
  }

  // SUBJECT
  for (const name of subjects) {
    await db.orm.public.Subject.create({ name });
  }

  // TEACHER
  for (let i = 1; i <= 15; i++) {
    await db.orm.public.Teacher.create({
      id: `teacher${i}`,
      username: `teacher${i}`,
      name: `TName${i}`,
      surname: `TSurname${i}`,
      email: `teacher${i}@example.com`,
      phone: `123-456-789${i}`,
      address: `Address${i}`,
      bloodType: 'A+',
      sex: i % 2 === 0 ? 'MALE' : 'FEMALE',
    });

    // Prisma 8 contract ini memakai model penghubung eksplisit untuk relasi
    // teacher-subject, bukan `subjects: { connect: ... }`.
    await db.orm.public.TeacherSubject.create({
      teacherId: `teacher${i}`,
      subjectId: (i % 10) + 1,
    });
  }

  // CLASS: contract mewajibkan setiap kelas mempunyai supervisor.
  for (let i = 1; i <= 6; i++) {
    await db.orm.public.Class.create({
      name: `${i}A`,
      gradeId: i,
      capacity: Math.floor(Math.random() * (20 - 15 + 1)) + 15,
      supervisorId: `teacher${i}`,
    });
  }

  // LESSON
  const now = new Date();
  const startTime = new Date(now);
  startTime.setHours(startTime.getHours() + 1);
  const endTime = new Date(now);
  endTime.setHours(endTime.getHours() + 3);

  for (let i = 1; i <= 30; i++) {
    await db.orm.public.Lesson.create({
      name: `Lesson${i}`,
      day: days[Math.floor(Math.random() * days.length)]!,
      startTime,
      endTime,
      subjectId: (i % 10) + 1,
      classId: (i % 6) + 1,
      teacherId: `teacher${(i % 15) + 1}`,
    });
  }

  // PARENT
  for (let i = 1; i <= 25; i++) {
    await db.orm.public.Parent.create({
      id: `parentId${i}`,
      username: `parentId${i}`,
      name: `PName ${i}`,
      surname: `PSurname ${i}`,
      email: `parent${i}@example.com`,
      phone: `123-456-789${i}`,
      address: `Address${i}`,
    });
  }

  // STUDENT
  for (let i = 1; i <= 50; i++) {
    await db.orm.public.Student.create({
      id: `student${i}`,
      username: `student${i}`,
      name: `SName${i}`,
      surname: `SSurname ${i}`,
      email: `student${i}@example.com`,
      phone: `987-654-321${i}`,
      address: `Address${i}`,
      bloodType: 'O-',
      sex: i % 2 === 0 ? 'MALE' : 'FEMALE',
      parentId: `parentId${Math.ceil(i / 2) % 25 || 25}`,
      gradeId: (i % 6) + 1,
      classId: (i % 6) + 1,
    });
  }

  // EXAM
  for (let i = 1; i <= 10; i++) {
    await db.orm.public.Exam.create({
      title: `Exam ${i}`,
      startTime,
      endTime,
      lessonId: (i % 30) + 1,
    });
  }

  // ASSIGNMENT
  for (let i = 1; i <= 10; i++) {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 1);
    await db.orm.public.Assignment.create({
      title: `Assignment ${i}`,
      startDate: startTime,
      dueDate,
      lessonId: (i % 30) + 1,
    });
  }

  // RESULT
  for (let i = 1; i <= 10; i++) {
    await db.orm.public.Result.create({
      score: 90,
      studentId: `student${i}`,
      ...(i <= 5 ? { examId: i } : { assignmentId: i - 5 }),
    });
  }

  // ATTENDANCE
  for (let i = 1; i <= 10; i++) {
    await db.orm.public.Attendance.create({
      date: now,
      present: true,
      studentId: `student${i}`,
      lessonId: (i % 30) + 1,
    });
  }

  // EVENT
  for (let i = 1; i <= 5; i++) {
    await db.orm.public.Event.create({
      title: `Event ${i}`,
      description: `Description for Event ${i}`,
      startTime,
      endTime,
      classId: (i % 5) + 1,
    });
  }

  // ANNOUNCEMENT
  for (let i = 1; i <= 5; i++) {
    await db.orm.public.Announcement.create({
      title: `Announcement ${i}`,
      description: `Description for Announcement ${i}`,
      date: now,
      classId: (i % 5) + 1,
    });
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
