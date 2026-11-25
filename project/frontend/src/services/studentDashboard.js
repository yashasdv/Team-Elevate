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
  }
}

const demoDashboardData = {
  streak: 4,
  longestStreak: 7,
  dailyGoalProgress: 1,
  dailyGoalTarget: 2,
  totalSolved: 12,
  classes: [{ id: 'demo-cs101', name: 'CS101 · Intro to coding' }],
  assignments: [
    {
      id: 'demo-loops-lab',
      title: 'Loops: Count with confidence',
      description: 'Practice repeating steps and tracking a running total.',
      difficulty: 'Beginner',
      dueAt: null,
      classNames: ['CS101 · Intro to coding'],
    },
    {
      id: 'demo-conditions-lab',
      title: 'Decisions with if statements',
      description: 'Use simple conditions to choose what your program does next.',
      difficulty: 'Intermediate',
      dueAt: null,
      classNames: ['CS101 · Intro to coding'],
    },
  ],
}

export async function getStudentDashboardData(user, { demo = false } = {}) {
  if (demo && import.meta.env.DEV) return demoDashboardData
  if (!db) throw new Error('Firebase is not configured. Add the web app settings to .env.local and restart the app.')

  const [analyticsSnapshot, classesSnapshot] = await Promise.all([
    getDoc(doc(db, 'studentAnalytics', user.uid)),
    getDocs(query(collection(db, 'classes'), where('studentIds', 'array-contains', user.uid))),
  ])

  const analytics = analyticsSnapshot.exists() ? analyticsSnapshot.data() : {}
  const streak = count(analytics.streak)
  const classDocs = classesSnapshot.docs
  const assignmentGroups = await Promise.all(classDocs.map(async (classSnapshot) => {
    const classData = classSnapshot.data()
    const assignmentSnapshot = await getDocs(query(
      collection(db, 'assignments'),
      where('classIds', 'array-contains', classSnapshot.id),
    ))

    return assignmentSnapshot.docs
      .filter((assignment) => assignmentIsVisible(assignment.data()))
      .map((assignment) => mapAssignment(assignment, classData.name || 'Your class'))
  }))

  const uniqueAssignments = new Map()
  assignmentGroups.flat().forEach((assignment) => {
    const existing = uniqueAssignments.get(assignment.id)
    if (existing) {
      existing.classNames.push(assignment.className)
    } else {
      uniqueAssignments.set(assignment.id, { ...assignment, classNames: [assignment.className] })
    }
  })

  return {
    streak,
    longestStreak: Math.max(streak, count(analytics.longestStreak)),
    dailyGoalProgress: count(analytics.dailyGoalProgress),
    dailyGoalTarget: Math.max(1, count(analytics.dailyGoalTarget) || 2),
    totalSolved: count(analytics.totalSolved),
    classes: classDocs.map((classSnapshot) => ({ id: classSnapshot.id, ...classSnapshot.data() })),
    assignments: [...uniqueAssignments.values()],
  }
}

export function joinClass(user, classCode) {
  return apiRequest('/api/class/join', user, {
    method: 'POST',
    body: JSON.stringify({ classCode: classCode.trim().toUpperCase() }),
  })
}
