import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { apiRequest } from './apiClient.js'

const localPreviewMode = import.meta.env.DEV || import.meta.env.MODE === 'demo'

function count(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0
}

function assignmentIsVisible(data) {
  const status = String(data.status || '').toLowerCase()
  return data.active !== false
    && data.isActive !== false
    && data.published !== false
    && !['draft', 'archived', 'closed'].includes(status)
}

function mapAssignment(snapshot, className) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    title: data.title || data.name || 'Untitled lab',
    description: data.description || data.instructions || 'Open this lab to see its instructions.',
    difficulty: data.difficulty || 'Starter',
    dueAt: data.dueAt || data.dueDate || null,
    className,
    classIds: Array.isArray(data.classIds) ? data.classIds : [],
    examples: data.examples || [],
    constraints: data.constraints || [],
    starterCode: data.starterCode || data.codeTemplate || '# Write your solution here\n',
    testCases: Array.isArray(data.testCases) ? data.testCases : [],
  }
}

const demoAssignments = {
  'demo-loops-lab': {
    id: 'demo-loops-lab',
    title: 'Loops: Count with confidence',
    description: 'Read a number n and print the sum of all numbers from 1 through n.',
    difficulty: 'Beginner',
    className: 'CS101 · Intro to coding',
    examples: [{ input: '5', output: '15' }],
    constraints: ['1 ≤ n ≤ 10,000'],
    starterCode: 'n = int(input())\n# Add the numbers from 1 to n\n',
    testCases: [{ input: '5', expected: '15' }],
  },
  'demo-variables-lab': {
    id: 'demo-variables-lab',
    title: 'Variables: Keep track of values',
    description: 'Read two numbers and print their sum.',
    difficulty: 'Beginner',
    className: 'CS101 · Intro to coding',
    examples: [{ input: '2 3', output: '5' }],
    constraints: ['Use variables to store both values.'],
    starterCode: 'a, b = map(int, input().split())\n# Add the values and print the result\n',
    testCases: [{ input: '2 3', expected: '5' }],
  },
  'demo-conditions-lab': {
    id: 'demo-conditions-lab',
    title: 'Decisions with if statements',
    description: 'Read a score. Print Pass when the score is at least 50; otherwise print Keep practicing.',
    difficulty: 'Beginner',
    className: 'CS101 · Intro to coding',
    examples: [{ input: '72', output: 'Pass' }],
    constraints: ['The score is a whole number from 0 to 100.'],
    starterCode: 'score = int(input())\n# Choose a message using an if statement\n',
    testCases: [{ input: '72', expected: 'Pass' }],
  },
  'demo-nested-loops-lab': {
    id: 'demo-nested-loops-lab',
    title: 'Nested loops: Build a pattern',
    description: 'Read a number n and print n rows of stars. Each row contains n stars.',
    difficulty: 'Intermediate',
    className: 'CS101 · Intro to coding',
    examples: [{ input: '3', output: '***\n***\n***' }],
    constraints: ['1 ≤ n ≤ 10'],
    starterCode: 'n = int(input())\n# Use one loop inside another\n',
    testCases: [{ input: '3', expected: '***\n***\n***' }],
  },
}

export async function getStudentAssignment(user, assignmentId, { demo = false } = {}) {
  if (demo && localPreviewMode) return demoAssignments[assignmentId] || null
  if (!db) throw new Error('Firebase is not configured. Add the web app settings to .env.local and restart the app.')
  const snapshot = await getDoc(doc(db, 'assignments', assignmentId))
  if (!snapshot.exists()) return null
  return mapAssignment(snapshot, 'Class assignment')
}

const demoStudentAssignments = [
  {
    ...demoAssignments['demo-loops-lab'],
    classNames: ['CS101 · Intro to coding'],
    status: 'completed',
    completedAt: new Date('2026-11-24T12:00:00Z'),
  },
  {
    id: 'demo-variables-lab',
    title: 'Variables: Keep track of values',
    description: 'Use variables to store and update a running total.',
    difficulty: 'Beginner',
    classNames: ['CS101 · Intro to coding'],
    status: 'completed',
    completedAt: new Date('2026-11-22T12:00:00Z'),
  },
  {
    id: 'demo-conditions-lab',
    title: 'Decisions with if statements',
    description: 'Use simple conditions to choose what your program does next.',
    difficulty: 'Beginner',
    classNames: ['CS101 · Intro to coding'],
    status: 'not-started',
    starterCode: '# Check the score and choose a message\n',
    testCases: [{ input: '72', expected: 'Pass' }],
  },
  {
    id: 'demo-nested-loops-lab',
    title: 'Nested loops: Build a pattern',
    description: 'Repeat a small pattern using one loop inside another.',
    difficulty: 'Intermediate',
    classNames: ['CS101 · Intro to coding'],
    status: 'not-started',
    starterCode: '# Use nested loops to draw a pattern\n',
    testCases: [{ input: '3', expected: '***' }],
  },
]

function assignmentCounts(assignments) {
  const completed = assignments.filter((assignment) => assignment.status === 'completed').length
  const notStarted = assignments.filter((assignment) => assignment.status === 'not-started').length
  const inProgress = assignments.filter((assignment) => assignment.status === 'in-progress').length
  return {
    total: assignments.length,
    completed,
    notCompleted: assignments.length - completed,
    notStarted,
    inProgress,
  }
}

export async function getStudentAssignments(user, { demo = false } = {}) {
  if (demo && localPreviewMode) {
    return { assignments: demoStudentAssignments, counts: assignmentCounts(demoStudentAssignments) }
  }
  if (!db) throw new Error('Firebase is not configured. Add the web app settings to .env.local and restart the app.')

  const classesSnapshot = await getDocs(query(
    collection(db, 'classes'),
    where('studentIds', 'array-contains', user.uid),
  ))
  const classDocs = classesSnapshot.docs
  const assignmentGroups = await Promise.all(classDocs.map(async (classSnapshot) => {
    const className = classSnapshot.data().name || 'Your class'
    const assignmentSnapshot = await getDocs(query(
      collection(db, 'assignments'),
      where('classIds', 'array-contains', classSnapshot.id),
    ))
    return assignmentSnapshot.docs
      .filter((assignmentSnapshot) => assignmentIsVisible(assignmentSnapshot.data()))
      .map((assignmentSnapshot) => ({ ...mapAssignment(assignmentSnapshot, className), classNames: [className] }))
  }))

  const uniqueAssignments = new Map()
  assignmentGroups.flat().forEach((assignment) => {
    const previous = uniqueAssignments.get(assignment.id)
    if (previous) previous.classNames.push(...assignment.classNames)
    else uniqueAssignments.set(assignment.id, assignment)
  })

  const submissions = await getDocs(query(
    collection(db, 'submissions'),
    where('studentId', '==', user.uid),
  ))
  const studentStatus = new Map()
  submissions.docs.forEach((submission) => {
    const data = submission.data()
    if (!data.assignmentId) return
    const status = String(data.status || '').toLowerCase()
    const previous = studentStatus.get(data.assignmentId)
    if (['pass', 'passed', 'completed'].includes(status)) {
      studentStatus.set(data.assignmentId, { status: 'completed', completedAt: data.submittedAt || data.createdAt || null })
    } else if (previous?.status !== 'completed') {
      studentStatus.set(data.assignmentId, { status: 'in-progress', completedAt: null })
    }
  })

  const assignments = [...uniqueAssignments.values()].map((assignment) => ({
    ...assignment,
    status: studentStatus.get(assignment.id)?.status || 'not-started',
    completedAt: studentStatus.get(assignment.id)?.completedAt || null,
  }))
  assignments.sort((first, second) => {
    const statusOrder = { 'not-started': 0, 'in-progress': 1, completed: 2 }
    return statusOrder[first.status] - statusOrder[second.status] || first.title.localeCompare(second.title)
  })
  return { assignments, counts: assignmentCounts(assignments) }
}

const demoDashboardData = {
  streak: 4,
  longestStreak: 7,
  dailyGoalProgress: 1,
  dailyGoalTarget: 2,
  totalSolved: 12,
  weakTopics: [
    { name: 'Recursion', detail: 'Practice tracing one call at a time.' },
    { name: 'Nested loops', detail: 'Track each loop variable separately.' },
  ],
  strongTopics: [
    { name: 'Loops', detail: 'You’re building a steady rhythm.' },
    { name: 'Variables', detail: 'You use values with confidence.' },
  ],
  classes: [{ id: 'demo-cs101', name: 'CS101 · Intro to coding' }],
}

export async function getStudentDashboardData(user, { demo = false } = {}) {
  if (demo && localPreviewMode) return demoDashboardData
  if (!db) throw new Error('Firebase is not configured. Add the web app settings to .env.local and restart the app.')

  const [analyticsSnapshot, classesSnapshot] = await Promise.all([
    getDoc(doc(db, 'studentAnalytics', user.uid)),
    getDocs(query(collection(db, 'classes'), where('studentIds', 'array-contains', user.uid))),
  ])

  const analytics = analyticsSnapshot.exists() ? analyticsSnapshot.data() : {}
  const streak = count(analytics.streak)
  const classDocs = classesSnapshot.docs
  const topicList = (value) => Array.isArray(value)
    ? value.map((topic) => typeof topic === 'string'
      ? { name: topic, detail: '' }
      : { name: topic.name || topic.topic || topic.title || 'Topic', detail: topic.detail || topic.note || '' })
    : []

  return {
    streak,
    longestStreak: Math.max(streak, count(analytics.longestStreak)),
    dailyGoalProgress: count(analytics.dailyGoalProgress),
    dailyGoalTarget: Math.max(1, count(analytics.dailyGoalTarget) || 2),
    totalSolved: count(analytics.totalSolved),
    weakTopics: topicList(analytics.weakTopics),
    strongTopics: topicList(analytics.strongTopics),
    classes: classDocs.map((classSnapshot) => ({ id: classSnapshot.id, ...classSnapshot.data() })),
  }
}

const demoLeaderboard = [{
  id: 'demo-cs101',
  name: 'CS101 · Intro to coding',
  students: [
    { uid: 'demo-asha', name: 'Asha Rao', totalSolved: 18, streak: 6, rank: 1 },
    { uid: 'demo-rohan', name: 'Rohan Patel', totalSolved: 15, streak: 5, rank: 2 },
    { uid: 'local-demo-student', name: 'Demo Student', totalSolved: 12, streak: 4, rank: 3 },
    { uid: 'demo-mia', name: 'Mia Chen', totalSolved: 9, streak: 2, rank: 4 },
  ],
}]

export async function getStudentLeaderboard(user, { demo = false } = {}) {
  if (demo && localPreviewMode) return demoLeaderboard
  if (!db) throw new Error('Firebase is not configured. Add the web app settings to .env.local and restart the app.')

  const classesSnapshot = await getDocs(query(
    collection(db, 'classes'),
    where('studentIds', 'array-contains', user.uid),
  ))

  return Promise.all(classesSnapshot.docs.map(async (classSnapshot) => {
    const classData = classSnapshot.data()
    const studentIds = [...new Set([...(classData.studentIds || []), user.uid])]
    const students = await Promise.all(studentIds.map(async (uid) => {
      const [profileSnapshot, analyticsSnapshot] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getDoc(doc(db, 'studentAnalytics', uid)),
      ])
      const profile = profileSnapshot.exists() ? profileSnapshot.data() : {}
      const analytics = analyticsSnapshot.exists() ? analyticsSnapshot.data() : {}
      return {
        uid,
        name: profile.displayName || (uid === user.uid ? user.displayName : '') || 'Student',
        totalSolved: count(analytics.totalSolved),
        streak: count(analytics.streak),
      }
    }))

    students.sort((first, second) => second.totalSolved - first.totalSolved
      || second.streak - first.streak
      || first.name.localeCompare(second.name))
    return {
      id: classSnapshot.id,
      name: classData.name || 'Your class',
      students: students.map((student, index) => ({ ...student, rank: index + 1 })),
    }
  }))
}

function topicList(value) {
  if (!Array.isArray(value)) return []
  return value.map((topic) => typeof topic === 'string'
    ? { name: topic, detail: '' }
    : { name: topic.name || topic.topic || topic.title || 'Topic', detail: topic.detail || topic.note || '' })
}

export async function getStudentProgress(user, { demo = false } = {}) {
  if (demo && localPreviewMode) {
    return {
      totalSolved: 12,
      streak: 4,
      rank: 3,
      totalPracticeMinutes: 145,
      weakTopics: [
        { name: 'Recursion', detail: 'Try tracing one call at a time.' },
        { name: 'Nested loops', detail: 'Track each loop variable separately.' },
      ],
      strongTopics: [
        { name: 'Loops', detail: 'You’re building a steady rhythm.' },
        { name: 'Variables', detail: 'You use values with confidence.' },
      ],
      source: 'demo',
    }
  }
  if (!db) throw new Error('Firebase is not configured. Add the web app settings to .env.local and restart the app.')

  let apiData = null
  let apiError = null
  try {
    apiData = await apiRequest(`/api/analytics/student/${encodeURIComponent(user.uid)}`, user)
  } catch (error) {
    apiError = error
  }

  let storedData = {}
  try {
    const analyticsSnapshot = await getDoc(doc(db, 'studentAnalytics', user.uid))
    if (analyticsSnapshot.exists()) storedData = analyticsSnapshot.data()
  } catch (error) {
    if (!apiData) throw error
  }

  if (!apiData && !Object.keys(storedData).length) {
    throw apiError || new Error('No progress data is available yet.')
  }

  return {
    totalSolved: count(apiData?.totalSolved ?? storedData.totalSolved),
    streak: count(apiData?.streak ?? storedData.streak),
    rank: apiData?.rank ?? storedData.rank ?? null,
    totalPracticeMinutes: count(storedData.totalPracticeMinutes ?? storedData.practiceMinutes ?? storedData.practiceTimeMinutes),
    weakTopics: topicList(apiData?.weakTopics ?? storedData.weakTopics),
    strongTopics: topicList(apiData?.strongTopics ?? storedData.strongTopics),
    source: apiData ? 'api' : 'firestore',
  }
}

export function joinClass(user, classCode) {
  return apiRequest('/api/class/join', user, {
    method: 'POST',
    body: JSON.stringify({ classCode: classCode.trim().toUpperCase() }),
  })
}
