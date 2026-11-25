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
}

export async function getStudentAssignment(user, assignmentId, { demo = false } = {}) {
  if (demo && localPreviewMode) return demoAssignments[assignmentId] || null
  if (!db) throw new Error('Firebase is not configured. Add the web app settings to .env.local and restart the app.')
  const snapshot = await getDoc(doc(db, 'assignments', assignmentId))
  if (!snapshot.exists()) return null
  return mapAssignment(snapshot, 'Class assignment')
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
  completedAssignments: [
    {
      id: 'demo-loops-lab',
      title: 'Loops: Count with confidence',
      description: 'Practice repeating steps and tracking a running total.',
      difficulty: 'Beginner',
      completedAt: new Date('2026-11-24T12:00:00Z'),
      classNames: ['CS101 · Intro to coding'],
    },
    {
      id: 'demo-variables-lab',
      title: 'Variables: Keep track of values',
      description: 'Use variables to store and update a running total.',
      difficulty: 'Beginner',
      completedAt: new Date('2026-11-22T12:00:00Z'),
      classNames: ['CS101 · Intro to coding'],
    },
  ],
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
  let completedAssignments = []
  let completedAssignmentsUnavailable = false
  try {
    const submissions = await getDocs(query(
      collection(db, 'submissions'),
      where('studentId', '==', user.uid),
    ))
    const passedAssignments = new Map()
    submissions.docs.forEach((submission) => {
      const data = submission.data()
      if (!['pass', 'passed', 'completed'].includes(String(data.status || '').toLowerCase()) || !data.assignmentId) return
      const previous = passedAssignments.get(data.assignmentId)
      const submittedAt = data.submittedAt || data.createdAt || null
      passedAssignments.set(data.assignmentId, previous || submittedAt)
    })

    completedAssignments = await Promise.all([...passedAssignments.entries()].map(async ([assignmentId, completedAt]) => {
      const assignmentSnapshot = await getDoc(doc(db, 'assignments', assignmentId))
      if (!assignmentSnapshot.exists()) return null
      const assignment = mapAssignment(assignmentSnapshot, 'Completed lab')
      const classNames = (assignment.classIds || [])
        .map((classId) => classDocs.find((classSnapshot) => classSnapshot.id === classId)?.data().name)
        .filter(Boolean)
      return { ...assignment, classNames: classNames.length ? classNames : ['Completed lab'], completedAt }
    }))
    completedAssignments = completedAssignments.filter(Boolean)
  } catch (error) {
    completedAssignmentsUnavailable = true
  }

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
    completedAssignments,
    completedAssignmentsUnavailable,
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
