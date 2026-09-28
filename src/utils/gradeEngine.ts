import type { Course, GradeScaleEntry, LetterGrade } from '../types'

export const GRADE_SCALE: GradeScaleEntry[] = [
  { minScore: 90, maxScore: 100, letterGrade: 'A+', gpa4: 4.0, classification: 'Xuất sắc (Excellent)', status: 'Pass' },
  { minScore: 80, maxScore: 89.99, letterGrade: 'A', gpa4: 3.5, classification: 'Giỏi (Very good)', status: 'Pass' },
  { minScore: 70, maxScore: 79.99, letterGrade: 'B+', gpa4: 3.0, classification: 'Khá (Good)', status: 'Pass' },
  { minScore: 60, maxScore: 69.99, letterGrade: 'B', gpa4: 2.5, classification: 'Trung bình Khá (Fair)', status: 'Pass' },
  { minScore: 50, maxScore: 59.99, letterGrade: 'C', gpa4: 2.0, classification: 'Trung bình (Average)', status: 'Pass' },
  { minScore: 40, maxScore: 49.99, letterGrade: 'D+', gpa4: 1.5, classification: 'Yếu (Weak)', status: 'Fail' },
  { minScore: 30, maxScore: 39.99, letterGrade: 'D', gpa4: 1.0, classification: 'Kém (Very weak)', status: 'Fail' },
  { minScore: 0, maxScore: 29.99, letterGrade: 'F', gpa4: 0.0, classification: 'Kém (Very weak)', status: 'Fail' },
]

export const TARGET_GRADE_THRESHOLDS: Record<LetterGrade, number> = {
  'A+': 90,
  'A': 80,
  'B+': 70,
  'B': 60,
  'C': 50,
  'D+': 40,
  'D': 30,
  'F': 0,
}

export function getGradeDetails(score: number): GradeScaleEntry {
  const boundedScore = Math.max(0, Math.min(100, score))
  for (const entry of GRADE_SCALE) {
    if (boundedScore >= entry.minScore) {
      return entry
    }
  }
  return GRADE_SCALE[GRADE_SCALE.length - 1]
}

export function calculateCourseCompositeScore(course: Course): {
  score100: number
  isProjected: boolean
  hasFinal: boolean
  gradeEntry: GradeScaleEntry
} {
  const inClass = course.scoreInClass ?? 0
  const midterm = course.scoreMidterm ?? 0
  const hasFinal = course.scoreFinal !== null && course.scoreFinal !== undefined

  if (hasFinal) {
    const finalScore = course.scoreFinal ?? 0
    const composite = (course.weightInClass * inClass) +
      (course.weightMidterm * midterm) +
      (course.weightFinal * finalScore)
    const rounded = Math.round(composite * 10) / 10
    return {
      score100: rounded,
      isProjected: false,
      hasFinal: true,
      gradeEntry: getGradeDetails(rounded),
    }
  }

  // Final not recorded yet: calculate current accumulated score normalized to recorded weights
  const recordedWeight = course.weightInClass + course.weightMidterm
  if (recordedWeight > 0) {
    const accumulated = (course.weightInClass * inClass) + (course.weightMidterm * midterm)
    const normalized = Math.round((accumulated / recordedWeight) * 10) / 10
    return {
      score100: normalized,
      isProjected: true,
      hasFinal: false,
      gradeEntry: getGradeDetails(normalized),
    }
  }

  return {
    score100: 0,
    isProjected: true,
    hasFinal: false,
    gradeEntry: GRADE_SCALE[GRADE_SCALE.length - 1],
  }
}

export interface TargetSolverResult {
  targetGrade: LetterGrade
  targetThreshold: number
  requiredFinalScore: number
  status: 'SECURED' | 'ACHIEVABLE' | 'UNATTAINABLE'
  message: string
}

export function solveTargetFinalScore(
  course: Course,
  customInClass?: number,
  customMidterm?: number,
  customTargetGrade?: LetterGrade
): TargetSolverResult {
  const inClass = customInClass ?? course.scoreInClass ?? 0
  const midterm = customMidterm ?? course.scoreMidterm ?? 0
  const targetGrade = customTargetGrade ?? course.targetGrade
  const threshold = TARGET_GRADE_THRESHOLDS[targetGrade] ?? 80

  const wInClass = course.weightInClass
  const wMidterm = course.weightMidterm
  const wFinal = course.weightFinal > 0 ? course.weightFinal : 0.50

  // S_final = (T - (w_inclass * S_inclass) - (w_midterm * S_midterm)) / w_final
  const required = (threshold - (wInClass * inClass) - (wMidterm * midterm)) / wFinal
  const roundedRequired = Math.round(required * 10) / 10

  if (roundedRequired <= 0) {
    return {
      targetGrade,
      targetThreshold: threshold,
      requiredFinalScore: 0,
      status: 'SECURED',
      message: 'Secured! Already achieved regardless of final exam score.',
    }
  }

  if (roundedRequired > 100) {
    return {
      targetGrade,
      targetThreshold: threshold,
      requiredFinalScore: roundedRequired,
      status: 'UNATTAINABLE',
      message: `Mathematically Unattainable (needs ${roundedRequired} / 100).`,
    }
  }

  return {
    targetGrade,
    targetThreshold: threshold,
    requiredFinalScore: roundedRequired,
    status: 'ACHIEVABLE',
    message: `Need at least ${roundedRequired} / 100 on the final exam.`,
  }
}

export interface GpaMetrics {
  gpa4: number
  gpa100: number
  totalCredits: number
  earnedCredits: number
  totalCourses: number
  completedCourses: number
}

export function calculateSemesterGPAs(courses: Course[]): GpaMetrics {
  if (courses.length === 0) {
    return {
      gpa4: 0,
      gpa100: 0,
      totalCredits: 0,
      earnedCredits: 0,
      totalCourses: 0,
      completedCourses: 0,
    }
  }

  let totalWeighted4 = 0
  let totalWeighted100 = 0
  let totalCredits = 0
  let earnedCredits = 0
  let completedCourses = 0

  for (const course of courses) {
    const { score100, hasFinal, gradeEntry } = calculateCourseCompositeScore(course)
    totalCredits += course.credits

    totalWeighted4 += gradeEntry.gpa4 * course.credits
    totalWeighted100 += score100 * course.credits

    if (gradeEntry.status === 'Pass') {
      earnedCredits += course.credits
    }

    if (hasFinal) {
      completedCourses += 1
    }
  }

  const gpa4 = totalCredits > 0 ? Math.round((totalWeighted4 / totalCredits) * 100) / 100 : 0
  const gpa100 = totalCredits > 0 ? Math.round((totalWeighted100 / totalCredits) * 10) / 10 : 0

  return {
    gpa4,
    gpa100,
    totalCredits,
    earnedCredits,
    totalCourses: courses.length,
    completedCourses,
  }
}
