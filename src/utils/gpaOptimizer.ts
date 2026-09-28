import type { Course, LetterGrade } from '../types'
import { solveTargetFinalScore } from './gradeEngine'

export interface OptimizedCourseTarget {
  courseId: string
  courseCode: string
  title: string
  credits: number
  targetGrade: LetterGrade
  gpaPoint: number
  requiredFinalScore: number
  isSecured: boolean
  isAttainable: boolean
}

export interface GpaOptimizerPlan {
  targetGpa: number
  achievedGpa: number
  isFeasible: boolean
  maxAttainableGpa: number
  difficulty: 'COMFORTABLE' | 'MODERATE' | 'INTENSIVE' | 'IMPOSSIBLE'
  courseTargets: OptimizedCourseTarget[]
  averageRequiredFinal: number
  highestExamPressure: { courseCode: string; score: number }
  summaryMessage: string
}

const EVALUATED_GRADES: LetterGrade[] = ['A+', 'A', 'B+', 'B', 'C']

export function optimizeSemesterGpa(courses: Course[], targetGpa: number): GpaOptimizerPlan {
  if (courses.length === 0) {
    return {
      targetGpa,
      achievedGpa: 0,
      isFeasible: false,
      maxAttainableGpa: 0,
      difficulty: 'IMPOSSIBLE',
      courseTargets: [],
      averageRequiredFinal: 0,
      highestExamPressure: { courseCode: '', score: 0 },
      summaryMessage: 'No enrolled courses to optimize.',
    }
  }

  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0)

  // Map grade to 4.0 points
  const gradeToPoint: Record<LetterGrade, number> = {
    'A+': 4.0,
    'A': 3.5,
    'B+': 3.0,
    'B': 2.5,
    'C': 2.0,
    'D+': 1.5,
    'D': 1.0,
    'F': 0.0,
  }

  // Find max attainable GPA (assuming 100 on every final exam)
  let maxWeightedGpa = 0
  for (const c of courses) {
    let bestGradeForCourse: LetterGrade = 'F'
    for (const g of EVALUATED_GRADES) {
      const solver = solveTargetFinalScore(c, undefined, undefined, g)
      if (solver.status === 'SECURED' || solver.requiredFinalScore <= 100) {
        bestGradeForCourse = g
        break
      }
    }
    maxWeightedGpa += (gradeToPoint[bestGradeForCourse] ?? 0) * c.credits
  }
  const maxAttainableGpa = Math.round((maxWeightedGpa / totalCredits) * 100) / 100

  // Generate candidate plans using branch & bound / cartesian search (typical n = 3 to 6 courses)
  type Assignment = Record<string, LetterGrade>

  let bestAssignment: Assignment | null = null
  let bestScorePenalty = Infinity

  function search(index: number, current: Assignment) {
    if (index === courses.length) {
      // Evaluate this combination
      let weightedPoints = 0
      let totalPenalty = 0
      let valid = true

      for (const course of courses) {
        const assignedGrade = current[course.id]
        const points = gradeToPoint[assignedGrade]
        weightedPoints += points * course.credits

        const solver = solveTargetFinalScore(course, undefined, undefined, assignedGrade)
        if (solver.status === 'UNATTAINABLE') {
          valid = false
          break
        }

        const requiredScore = solver.status === 'SECURED' ? 0 : solver.requiredFinalScore
        // Quadratic penalty to prioritize balanced effort rather than 99% on one course and 40% on another
        totalPenalty += Math.pow(requiredScore, 2) * (course.credits / totalCredits)
      }

      if (valid) {
        const gpa = Math.round((weightedPoints / totalCredits) * 100) / 100
        if (gpa >= targetGpa) {
          if (totalPenalty < bestScorePenalty) {
            bestScorePenalty = totalPenalty
            bestAssignment = { ...current }
          }
        }
      }
      return
    }

    const course = courses[index]
    for (const grade of EVALUATED_GRADES) {
      current[course.id] = grade
      search(index + 1, current)
    }
  }

  search(0, {})

  // If no feasible plan met targetGpa, fallback to the best possible plan
  const isFeasible = bestAssignment !== null

  const chosenAssignment: Assignment = bestAssignment || {}
  if (!isFeasible) {
    // Greedy fallback to highest achievable grades
    for (const c of courses) {
      for (const g of EVALUATED_GRADES) {
        const solver = solveTargetFinalScore(c, undefined, undefined, g)
        if (solver.status === 'SECURED' || solver.requiredFinalScore <= 100) {
          chosenAssignment[c.id] = g
          break
        }
      }
      if (!chosenAssignment[c.id]) chosenAssignment[c.id] = 'C'
    }
  }

  // Build result items
  let totalFinalReq = 0
  let highestPressure = { courseCode: '', score: 0 }
  const courseTargets: OptimizedCourseTarget[] = []

  let totalWeightedPts = 0

  for (const c of courses) {
    const assignedGrade = chosenAssignment[c.id] || c.targetGrade
    const solver = solveTargetFinalScore(c, undefined, undefined, assignedGrade)
    const points = gradeToPoint[assignedGrade] || 3.0
    totalWeightedPts += points * c.credits

    const reqScore = solver.status === 'SECURED' ? 0 : solver.requiredFinalScore
    totalFinalReq += reqScore

    if (reqScore > highestPressure.score) {
      highestPressure = { courseCode: c.code, score: reqScore }
    }

    courseTargets.push({
      courseId: c.id,
      courseCode: c.code,
      title: c.title,
      credits: c.credits,
      targetGrade: assignedGrade,
      gpaPoint: points,
      requiredFinalScore: reqScore,
      isSecured: solver.status === 'SECURED',
      isAttainable: solver.status !== 'UNATTAINABLE',
    })
  }

  const finalAchievedGpa = Math.round((totalWeightedPts / totalCredits) * 100) / 100
  const avgFinal = Math.round((totalFinalReq / courses.length) * 10) / 10

  let difficulty: GpaOptimizerPlan['difficulty'] = 'COMFORTABLE'
  if (!isFeasible) {
    difficulty = 'IMPOSSIBLE'
  } else if (avgFinal > 88 || highestPressure.score > 94) {
    difficulty = 'INTENSIVE'
  } else if (avgFinal > 75 || highestPressure.score > 85) {
    difficulty = 'MODERATE'
  }

  let summaryMessage = ''
  if (!isFeasible) {
    summaryMessage = `Target GPA ${targetGpa.toFixed(2)} is mathematically beyond reach with current midterms (Max attainable: ${maxAttainableGpa.toFixed(2)}).`
  } else if (difficulty === 'COMFORTABLE') {
    summaryMessage = `Target GPA ${targetGpa.toFixed(2)} is comfortably within reach! Average required final exam score is only ${avgFinal} / 100.`
  } else if (difficulty === 'MODERATE') {
    summaryMessage = `Target GPA ${targetGpa.toFixed(2)} is achievable with moderate study. Average final exam target is ${avgFinal} / 100.`
  } else {
    summaryMessage = `High intensity required! Reaching GPA ${targetGpa.toFixed(2)} demands an average of ${avgFinal} on final exams, peaking at ${highestPressure.score} in ${highestPressure.courseCode}.`
  }

  return {
    targetGpa,
    achievedGpa: finalAchievedGpa,
    isFeasible,
    maxAttainableGpa,
    difficulty,
    courseTargets,
    averageRequiredFinal: avgFinal,
    highestExamPressure: highestPressure,
    summaryMessage,
  }
}
