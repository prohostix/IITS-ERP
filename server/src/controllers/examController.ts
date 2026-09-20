import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getExamDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { materialId } = req.params;

  const exam = await prisma.exam.findUnique({
    where: { materialId },
    include: {
      questions: {
        select: {
          id: true,
          questionText: true,
          questionType: true,
          options: true,
          marks: true,
          order: true
          // Intentionally omitting correctAnswer
        },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!exam) {
    res.status(404).json({ success: false, message: 'Exam not found for this material' });
    return;
  }

  // Check if student already submitted
  const studentInfo = await prisma.student.findFirst({
    where: {
        id: req.user.studentId
    }
  });

  if (!studentInfo) {
      res.status(400).json({ success: false, message: 'Student not found' });
      return;
  }

  let submission = await prisma.examSubmission.findUnique({
    where: {
      examId_studentId: {
        examId: exam.id,
        studentId: studentInfo.id
      }
    },
    include: {
      answers: true
    }
  });

  res.json({ success: true, data: { exam, submission } });
});

export const startExam = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { materialId } = req.params;

  const exam = await prisma.exam.findUnique({
    where: { materialId }
  });

  if (!exam) {
    res.status(404).json({ success: false, message: 'Exam not found' });
    return;
  }

  const studentInfo = await prisma.student.findFirst({
    where: {
        id: req.user.studentId
    }
  });

  if (!studentInfo) {
      res.status(400).json({ success: false, message: 'Student not found' });
      return;
  }

  let submission = await prisma.examSubmission.findUnique({
    where: {
      examId_studentId: {
        examId: exam.id,
        studentId: studentInfo.id
      }
    }
  });

  if (!submission) {
    submission = await prisma.examSubmission.create({
      data: {
        examId: exam.id,
        studentId: studentInfo.id,
        status: 'in_progress'
      }
    });
  }

  res.json({ success: true, data: submission });
});

export const submitExam = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { materialId } = req.params;
  const { answers } = req.body; // Array of { questionId, answerText }

  const exam = await prisma.exam.findUnique({
    where: { materialId },
    include: { questions: true }
  });

  if (!exam) {
    res.status(404).json({ success: false, message: 'Exam not found' });
    return;
  }

  const studentInfo = await prisma.student.findFirst({
    where: {
        id: req.user.studentId
    }
  });

  if (!studentInfo) {
      res.status(400).json({ success: false, message: 'Student not found' });
      return;
  }

  const submission = await prisma.examSubmission.findUnique({
    where: {
      examId_studentId: {
        examId: exam.id,
        studentId: studentInfo.id
      }
    }
  });

  if (!submission) {
    res.status(400).json({ success: false, message: 'Exam not started' });
    return;
  }

  if (submission.status === 'submitted') {
    res.status(400).json({ success: false, message: 'Exam already submitted' });
    return;
  }

  let score = 0;
  const answerPromises = answers.map(async (ans: any) => {
    const question = exam.questions.find(q => q.id === ans.questionId);
    let isCorrect = null;
    let marksAwarded = 0;

    if (question && question.questionType === 'multiple_choice') {
      isCorrect = (ans.answerText === question.correctAnswer);
      if (isCorrect) {
        marksAwarded = question.marks;
        score += marksAwarded;
      }
    }

    return prisma.examAnswer.create({
      data: {
        submissionId: submission.id,
        questionId: ans.questionId,
        answerText: ans.answerText,
        isCorrect,
        marksAwarded
      }
    });
  });

  await Promise.all(answerPromises);

  const updatedSubmission = await prisma.examSubmission.update({
    where: { id: submission.id },
    data: {
      status: 'submitted',
      submittedAt: new Date(),
      score: exam.type === 'objective' ? score : null
    },
    include: { answers: true }
  });

  res.json({ success: true, data: updatedSubmission });
});

export const getExamSubmissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { examId } = req.params;

  const submissions = await prisma.examSubmission.findMany({
    where: { examId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          enrollmentNo: true
        }
      },
      answers: true
    },
    orderBy: { startedAt: 'desc' }
  });

  res.json({ submissions });
});

export const gradeSubjectiveExam = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { submissionId } = req.params;
  const grades = req.body.grades as Array<{ questionId: string; marksAwarded: number }>; // Array of { questionId, marksAwarded }

  const submission = await prisma.examSubmission.findUnique({
    where: { id: submissionId },
    include: { answers: true, exam: true }
  });

  if (!submission) {
    res.status(404);
    throw new Error('Submission not found');
  }

  let totalScore = 0;

  const gradePromises = grades.map((g: any) => {
    totalScore += Number(g.marksAwarded);
    return prisma.examAnswer.updateMany({
      where: {
        submissionId: submission.id,
        questionId: g.questionId
      },
      data: {
        marksAwarded: Number(g.marksAwarded),
        isCorrect: Number(g.marksAwarded) > 0
      }
    });
  });

  await Promise.all(gradePromises);

  const updatedSubmission = await prisma.examSubmission.update({
    where: { id: submissionId },
    data: {
      status: 'graded',
      score: totalScore
    }
  });

  res.json({ submission: updatedSubmission });
});
