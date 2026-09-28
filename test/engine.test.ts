import assert from 'node:assert'
import test from 'node:test'
import { getGradeDetails, solveTargetFinalScore, calculateSemesterGPAs } from '../src/utils/gradeEngine.ts'
import { validateSingleDRI, canApproveDeliverable, computeDefaultBufferDate } from '../src/utils/bufferEngine.ts'
import { parseICS, convertEventToDeliverable, detectScheduleConflicts, detectBufferOverlaps } from '../src/utils/calendarEngine.ts'
import { optimizeSemesterGpa } from '../src/utils/gpaOptimizer.ts'
import { computeTableDiff, mergeSelectedDiffs } from '../src/utils/syncDiffEngine.ts'
import type { Course, Deliverable, CalendarEvent } from '../src/types/index.ts'

test('Institutional Grade Scale Conversions', () => {
  assert.strictEqual(getGradeDetails(95).letterGrade, 'A+')
  assert.strictEqual(getGradeDetails(90).gpa4, 4.0)
  assert.strictEqual(getGradeDetails(85).letterGrade, 'A')
  assert.strictEqual(getGradeDetails(80).gpa4, 3.5)
  assert.strictEqual(getGradeDetails(75).letterGrade, 'B+')
  assert.strictEqual(getGradeDetails(70).gpa4, 3.0)
  assert.strictEqual(getGradeDetails(65).letterGrade, 'B')
  assert.strictEqual(getGradeDetails(60).gpa4, 2.5)
  assert.strictEqual(getGradeDetails(55).letterGrade, 'C')
  assert.strictEqual(getGradeDetails(50).gpa4, 2.0)
  assert.strictEqual(getGradeDetails(45).letterGrade, 'D+')
  assert.strictEqual(getGradeDetails(40).gpa4, 1.5)
  assert.strictEqual(getGradeDetails(35).letterGrade, 'D')
  assert.strictEqual(getGradeDetails(30).gpa4, 1.0)
  assert.strictEqual(getGradeDetails(25).letterGrade, 'F')
  assert.strictEqual(getGradeDetails(10).gpa4, 0.0)
})

test('Predictive Target Final Score Solver', () => {
  const dsaCourse: Course = {
    id: 'c1',
    code: 'DSA201',
    title: 'Data Structures',
    credits: 4,
    weightInClass: 0.20,
    weightMidterm: 0.30,
    weightFinal: 0.50,
    scoreInClass: 88,
    scoreMidterm: 82,
    scoreFinal: null,
    targetGrade: 'A+',
  }

  // Target A+ (threshold 90) -> (90 - (0.2*88 + 0.3*82)) / 0.5 = (90 - 42.2) / 0.5 = 95.6
  const resultA = solveTargetFinalScore(dsaCourse)
  assert.strictEqual(resultA.status, 'ACHIEVABLE')
  assert.strictEqual(resultA.requiredFinalScore, 95.6)

  // Target C (threshold 50) -> (50 - 42.2) / 0.5 = 15.6
  const resultC = solveTargetFinalScore(dsaCourse, undefined, undefined, 'C')
  assert.strictEqual(resultC.status, 'ACHIEVABLE')
  assert.strictEqual(resultC.requiredFinalScore, 15.6)

  // Secured condition (inClass: 100, midterm: 100, target C: 50 pts) -> 50 pts already locked
  const securedResult = solveTargetFinalScore(dsaCourse, 100, 100, 'C')
  assert.strictEqual(securedResult.status, 'SECURED')
  assert.strictEqual(securedResult.requiredFinalScore, 0)

  // Unattainable condition (inClass: 30, midterm: 30, target A+: 90) -> requires 150/100
  const unattainableResult = solveTargetFinalScore(dsaCourse, 30, 30, 'A+')
  assert.strictEqual(unattainableResult.status, 'UNATTAINABLE')
  assert.strictEqual(unattainableResult.requiredFinalScore, 150)
})

test('Semester GPA Engine', () => {
  const courses: Course[] = [
    {
      id: 'c1',
      code: 'DSA201',
      title: 'DSA',
      credits: 4,
      weightInClass: 0.2,
      weightMidterm: 0.3,
      weightFinal: 0.5,
      scoreInClass: 90,
      scoreMidterm: 90,
      scoreFinal: 90,
      targetGrade: 'A+',
    },
    {
      id: 'c2',
      code: 'PDM102',
      title: 'Python',
      credits: 3,
      weightInClass: 0.25,
      weightMidterm: 0.25,
      weightFinal: 0.5,
      scoreInClass: 80,
      scoreMidterm: 80,
      scoreFinal: 80,
      targetGrade: 'A',
    },
  ]

  const metrics = calculateSemesterGPAs(courses)
  assert.strictEqual(metrics.totalCredits, 7)
  assert.strictEqual(metrics.earnedCredits, 7)
  assert.strictEqual(metrics.gpa4, 3.79)
})

test('Single-Threaded Ownership (DRI) Enforcement', () => {
  assert.strictEqual(validateSingleDRI('Alex').isValid, true)
  assert.strictEqual(validateSingleDRI('').isValid, false)
  assert.strictEqual(validateSingleDRI('Alex & Liam').isValid, false)
  assert.strictEqual(validateSingleDRI('Alex and Liam').isValid, false)
  assert.strictEqual(validateSingleDRI('Alex, Liam').isValid, false)
})

test('Peer Reviewer Sign-off Rule for APPROVED Status', () => {
  const mockDel: Deliverable = {
    id: 'd1',
    projectId: 'p1',
    taskName: 'Module',
    milestonePhase: 'Phase 1',
    ownerName: 'Alex',
    internalBufferDeadline: new Date().toISOString(),
    officialDueDate: new Date().toISOString(),
    peerReviewer: '',
    status: 'IN_PROGRESS',
    artifactUrl: '',
  }

  // Missing reviewer -> cannot approve
  assert.strictEqual(canApproveDeliverable(mockDel).canApprove, false)

  // Reviewer same as owner -> cannot approve
  mockDel.peerReviewer = 'Alex'
  assert.strictEqual(canApproveDeliverable(mockDel).canApprove, false)

  // Reviewer different -> approved!
  mockDel.peerReviewer = 'Dung'
  assert.strictEqual(canApproveDeliverable(mockDel).canApprove, true)
})

test('72-Hour Internal Safety Buffer Calculation', () => {
  const official = '2026-10-15T18:00:00.000Z'
  const bufferIso = computeDefaultBufferDate(official, 72)
  const diffHours = (new Date(official).getTime() - new Date(bufferIso).getTime()) / (3600 * 1000)
  assert.strictEqual(diffHours, 72)
})

test('iCalendar (.ics) Parsing & Buffer Deliverable Conversion', () => {
  const sampleIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:canvas-assignment-9921
SUMMARY:DSA201 Midterm Examination
DTSTART:20261020T140000Z
LOCATION:Hall C
DESCRIPTION:Comprehensive midterm on binary trees
END:VEVENT
BEGIN:VEVENT
UID:canvas-lab-4412
SUMMARY:PDM102 Homework 3 - Data Ingestion
DTSTART:20261018T235900Z
LOCATION:Canvas LMS
END:VEVENT
END:VCALENDAR`

  const events = parseICS(sampleIcs)
  assert.strictEqual(events.length, 2)
  assert.strictEqual(events[0].title, 'PDM102 Homework 3 - Data Ingestion')
  assert.strictEqual(events[0].type, 'ASSIGNMENT')
  assert.strictEqual(events[1].title, 'DSA201 Midterm Examination')
  assert.strictEqual(events[1].type, 'EXAM')
  assert.strictEqual(events[1].courseCode, 'DSA201')

  // Convert to buffer deliverable
  const deliverable = convertEventToDeliverable(events[1], 'p-dsa', 'Alan (Lead)')
  assert.strictEqual(deliverable.taskName, 'DSA201 Midterm Examination')
  assert.strictEqual(deliverable.ownerName, 'Alan (Lead)')

  // Internal buffer deadline must be 72 hours before the exam start date
  const examDateMs = new Date(events[1].startDate).getTime()
  const bufferDateMs = new Date(deliverable.internalBufferDeadline).getTime()
  const hoursDiff = (examDateMs - bufferDateMs) / (3600 * 1000)
  assert.strictEqual(hoursDiff, 72)
})

test('Semester Target GPA Macro Optimizer', () => {
  const sampleCourses: Course[] = [
    {
      id: 'c1',
      code: 'DSA201',
      title: 'DSA',
      credits: 4,
      weightInClass: 0.20,
      weightMidterm: 0.30,
      weightFinal: 0.50,
      scoreInClass: 90,
      scoreMidterm: 85,
      scoreFinal: null,
      targetGrade: 'A',
    },
    {
      id: 'c2',
      code: 'PDM102',
      title: 'PDM',
      credits: 3,
      weightInClass: 0.25,
      weightMidterm: 0.25,
      weightFinal: 0.50,
      scoreInClass: 92,
      scoreMidterm: 88,
      scoreFinal: null,
      targetGrade: 'A',
    },
    {
      id: 'c3',
      code: 'MATH204',
      title: 'Math',
      credits: 3,
      weightInClass: 0.20,
      weightMidterm: 0.30,
      weightFinal: 0.50,
      scoreInClass: 80,
      scoreMidterm: 78,
      scoreFinal: null,
      targetGrade: 'B+',
    },
  ]

  const plan = optimizeSemesterGpa(sampleCourses, 3.60)
  assert.strictEqual(plan.isFeasible, true)
  assert.ok(plan.achievedGpa >= 3.60, `Achieved GPA ${plan.achievedGpa} should be >= 3.60`)
  assert.ok(plan.courseTargets.length === 3)
  assert.ok(plan.averageRequiredFinal <= 100)
})

test('Schedule Conflict & Exam Crunch Detection', () => {
  const events: CalendarEvent[] = [
    {
      id: 'e1',
      title: 'DSA Midterm',
      type: 'EXAM',
      startDate: '2026-10-22T09:00:00.000Z',
      endDate: '2026-10-22T11:00:00.000Z',
    },
    {
      id: 'e2',
      title: 'Math Midterm',
      type: 'EXAM',
      startDate: '2026-10-22T14:00:00.000Z',
      endDate: '2026-10-22T16:00:00.000Z',
    },
    {
      id: 'e3',
      title: 'Algorithms Lecture',
      type: 'LECTURE',
      startDate: '2026-10-23T10:00:00.000Z',
      endDate: '2026-10-23T12:00:00.000Z',
    },
    {
      id: 'e4',
      title: 'ML Study Session',
      type: 'STUDY_SESSION',
      startDate: '2026-10-23T11:30:00.000Z',
      endDate: '2026-10-23T13:00:00.000Z',
    },
  ]

  const conflicts = detectScheduleConflicts(events)
  assert.strictEqual(conflicts.length, 2)
  const examCrunch = conflicts.find((c) => c.conflictType === 'EXAM_CRUNCH')
  assert.ok(examCrunch, 'Should detect exam crunch on 2026-10-22')
  assert.strictEqual(examCrunch?.date, '2026-10-22')

  const overlap = conflicts.find((c) => c.conflictType === 'OVERLAP')
  assert.ok(overlap, 'Should detect overlap on 2026-10-23')
  assert.strictEqual(overlap?.date, '2026-10-23')
})

test('Buffer Congestion Detection', () => {
  const dels: Deliverable[] = [
    {
      id: 'd1',
      projectId: 'p1',
      taskName: 'Task A',
      milestonePhase: 'Phase 1',
      ownerName: 'Alex',
      internalBufferDeadline: '2026-10-25T18:00:00.000Z',
      officialDueDate: '2026-10-28T18:00:00.000Z',
      peerReviewer: 'Dung',
      status: 'IN_PROGRESS',
      artifactUrl: '',
    },
    {
      id: 'd2',
      projectId: 'p1',
      taskName: 'Task B',
      milestonePhase: 'Phase 1',
      ownerName: 'Liam',
      internalBufferDeadline: '2026-10-25T18:00:00.000Z',
      officialDueDate: '2026-10-28T18:00:00.000Z',
      peerReviewer: 'Alex',
      status: 'DRAFT_READY',
      artifactUrl: '',
    },
    {
      id: 'd3',
      projectId: 'p1',
      taskName: 'Task C',
      milestonePhase: 'Phase 1',
      ownerName: 'Sarah',
      internalBufferDeadline: '2026-10-25T18:00:00.000Z',
      officialDueDate: '2026-10-28T18:00:00.000Z',
      peerReviewer: 'Dung',
      status: 'APPROVED', // Should be ignored because approved
      artifactUrl: '',
    },
  ]

  const congestions = detectBufferOverlaps(dels)
  assert.strictEqual(congestions.length, 1)
  assert.strictEqual(congestions[0].count, 2)
  assert.strictEqual(congestions[0].date, '2026-10-25')
})

test('Two-Way Sync Diff Computation & Type Coercion', () => {
  const localDels: Deliverable[] = [
    {
      id: 'd1',
      projectId: 'p1',
      taskName: 'Task One',
      milestonePhase: 'Phase 1',
      ownerName: 'Alex',
      internalBufferDeadline: '2026-10-25T18:00:00.000Z',
      officialDueDate: '2026-10-28T18:00:00.000Z',
      peerReviewer: '',
      status: 'IN_PROGRESS',
      artifactUrl: '',
    },
    {
      id: 'd2',
      projectId: 'p1',
      taskName: 'Task Two',
      milestonePhase: 'Phase 1',
      ownerName: 'Liam',
      internalBufferDeadline: '2026-10-25T18:00:00.000Z',
      officialDueDate: '2026-10-28T18:00:00.000Z',
      peerReviewer: 'Alex',
      status: 'DRAFT_READY',
      artifactUrl: 'https://github.com/pr/1',
    },
  ]

  const remoteDels: any[] = [
    // d1 modified by teammate: status changed to APPROVED, reviewer added
    {
      id: 'd1',
      projectId: 'p1',
      taskName: 'Task One',
      milestonePhase: 'Phase 1',
      ownerName: 'Alex',
      internalBufferDeadline: '2026-10-25T18:00:00.000Z',
      officialDueDate: '2026-10-28T18:00:00.000Z',
      peerReviewer: 'Dung',
      status: 'APPROVED',
      artifactUrl: '',
    },
    // d2 unchanged
    {
      id: 'd2',
      projectId: 'p1',
      taskName: 'Task Two',
      milestonePhase: 'Phase 1',
      ownerName: 'Liam',
      internalBufferDeadline: '2026-10-25T18:00:00.000Z',
      officialDueDate: '2026-10-28T18:00:00.000Z',
      peerReviewer: 'Alex',
      status: 'DRAFT_READY',
      artifactUrl: 'https://github.com/pr/1',
    },
    // d3 new task added by teammate in Google Sheet
    {
      id: 'd3',
      projectId: 'p1',
      taskName: 'Task Three (From Sheet)',
      milestonePhase: 'Phase 2',
      ownerName: 'Sarah',
      internalBufferDeadline: '2026-11-01T18:00:00.000Z',
      officialDueDate: '2026-11-04T18:00:00.000Z',
      peerReviewer: 'Alex',
      status: 'NOT_STARTED',
      artifactUrl: '',
    },
  ]

  const diffResult = computeTableDiff('Deliverables', localDels, remoteDels)
  assert.strictEqual(diffResult.totalChanges, 2)
  assert.strictEqual(diffResult.newCount, 1)
  assert.strictEqual(diffResult.modifiedCount, 1)

  const modD1 = diffResult.items.find((d) => d.id === 'd1')
  assert.ok(modD1)
  assert.strictEqual(modD1?.status, 'MODIFIED')
  assert.ok(modD1?.changedFields.some((f) => f.field === 'status' && f.newValue === 'APPROVED'))
  assert.ok(modD1?.changedFields.some((f) => f.field === 'peerReviewer' && f.newValue === 'Dung'))

  const newD3 = diffResult.items.find((d) => d.id === 'd3')
  assert.ok(newD3)
  assert.strictEqual(newD3?.status, 'NEW')

  // Test selective merge: accept only d1, reject d3
  const merged = mergeSelectedDiffs(localDels, [modD1!])
  assert.strictEqual(merged.length, 2)
  const mergedD1 = merged.find((d) => d.id === 'd1')
  assert.strictEqual(mergedD1?.status, 'APPROVED')
  assert.strictEqual(mergedD1?.peerReviewer, 'Dung')
  // d3 should not be in merged because it wasn't selected
  assert.strictEqual(merged.some((d) => d.id === 'd3'), false)

  // Now accept both
  const mergedAll = mergeSelectedDiffs(localDels, [modD1!, newD3!])
  assert.strictEqual(mergedAll.length, 3)
  assert.ok(mergedAll.some((d) => d.id === 'd3'))
})


