# Firestore schema

This document records the fields used by the checked-in backend and the proposed browser contracts for the teacher and student experiences. Firebase collections are created when documents are written; this file is the schema contract, not a command to pre-create empty collections.

## Collections

| Collection | Document ID | Fields used by code | Writers and readers |
| --- | --- | --- | --- |
| `users` | Firebase UID | `displayName: string`, `college: string`, `year: string`, `role: "student" | "teacher"`, `createdAt: timestamp`, `updatedAt: timestamp` | Backend writes profiles. A user reads their own profile; teacher access to student profiles should be limited to their enrolled or pending students. |
| `classes` | Firestore generated ID | `name: string`, `classCode: string`, `teacherId: UID`, `studentIds: string[]`, `pendingStudentIds: string[]` | Backend creates and updates membership. The owning teacher reads the class; enrolled or pending students may read it where needed. |
| `assignments` | Firestore generated ID | `classIds: string[]` (required by class analytics); teacher UI contract: `title`, `description`, `starterCode`, `dueDate`, `createdBy`, `createdAt` | Teacher creates/updates. Enrolled students read assigned work. Keep private test cases out of student-readable documents. |
| `active_sessions` | Student UID | Proposed live-monitor contract: `studentId`, `classId`, `assignmentId`, `status` (`working` or `passed`), `struggleScore`, `latestError`, `code`, `updatedAt` | Student writes only their own session. Student reads their own session. A teacher reads sessions for classes they own. `status` and field names are not yet confirmed by student client code. |
| `submissions` | Firestore generated ID | Backend analytics reads `studentId`, `assignmentId`, `problemId`, `status` (`pass`, `fail`, or `error`), and `errorType` or `error`. Proposed addition: `classId`, `createdAt`. | Student creates their own submissions. Student reads their own; the owning teacher reads submissions for their class. |
| `progress` | Student UID or generated ID (choose one convention before implementation) | No backend fields currently confirmed. Proposed: `studentId`, `classId`, `assignmentId`, `completedProblemIds`, `updatedAt`. | Student reads own progress; student writes only own progress. Teachers read progress for their classes. |
| `leaderboard` | Class ID or generated ID (choose one convention before implementation) | No backend fields currently confirmed. Proposed: `classId`, `entries: [{ studentId, score, rank }]`, `updatedAt`. | Backend writes. Class members read. |
| `notes` | Firestore generated ID | Teacher UI contract: `classId`, `teacherId`, `title`, `bodyMarkdown`, `createdAt`, `updatedAt` | Owning teacher creates/updates/deletes. Class members read. |
| `mock_tests` | Firestore generated ID | No backend fields currently confirmed. Proposed: `classId`, `title`, `description`, `problemIds`, `startsAt`, `durationMinutes`, `createdBy` | Owning teacher manages. Class members read published tests. |
| `problems` | Firestore generated ID | Backend analytics reads `assignmentId` and `topicTags`. Seed/UI contract: `title`, `description`, `starterCode`, `testCases`, `difficulty`, `topicTags` | Teacher manages. Students read problem statements and public cases only. Private cases must be stored separately or evaluated by the backend. |
| `studentAnalytics` | Student UID | Backend reads `streak`, `totalSolved`, `weakTopics`, `strongTopics`, `dailyGoalProgress`, `rank` | Backend writes. Student reads their own analytics. |

## Confirmed backend contracts

- `POST /api/class/create` creates a `classes` document with `name`, `classCode`, `teacherId`, `studentIds`, and `pendingStudentIds`.
- `POST /api/class/join` adds the authenticated student's UID to `pendingStudentIds`.
- `POST /api/class/approve` removes a UID from `pendingStudentIds` and, when approved, adds it to `studentIds`.
- `GET /api/analytics/class/{class_id}` reads `classes.studentIds`, `assignments.classIds`, `problems.assignmentId`, `problems.topicTags`, `submissions.assignmentId`, `submissions.problemId`, `submissions.studentId`, `submissions.status`, `submissions.errorType`/`error`, and `users.displayName`.
- `GET /api/analytics/student/{user_id}` reads the `studentAnalytics` document whose ID is the user's UID.
- `POST /api/ai/generate-questions` returns `{ "problems": [{ "title", "description", "starterCode", "testCases": [{ "input", "expectedOutput" }] }] }`.

## Integration decisions still needed

1. The live student client must confirm its session fields and status values before the monitor query and rules are finalized.
2. The current backend does not save assignments, problems, notes, progress, or mock tests. The teacher UI will write these directly through Firebase; document ownership and field validation must be enforced in `firestore.rules`.
3. The current `/auth/profile` model does not store email. The pending-request UI can display name, college, and year from `users`; email needs a backend/profile contract change before it can be shown.
4. The backend analytics endpoint returns `topErrors` as labels, not counts or percentages. A frequency chart needs either a response change or a separate aggregation source.
5. Hidden test cases must not be stored in a document students can read. Prefer separate teacher-only documents or server-side evaluation.

These gaps are explicit so the browser implementation does not rely on fields that the current project does not provide.
