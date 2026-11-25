"""Teacher class analytics and student self analytics."""

from collections import Counter, defaultdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from routes.auth import get_current_user
from services.firebase_service import get_firestore

router = APIRouter()


def _require_teacher(user: dict[str, Any]) -> None:
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teacher role required")


def _chunks(items: list[str], size: int = 30):
    for index in range(0, len(items), size):
        yield items[index:index + size]


@router.get("/analytics/class/{class_id}", tags=["Analytics"])
async def class_analytics(class_id: str, user: dict[str, Any] = Depends(get_current_user)):
    _require_teacher(user)
    db = get_firestore()
    class_snapshot = db.collection("classes").document(class_id).get()
    if not class_snapshot.exists:
        raise HTTPException(status_code=404, detail="Class not found")
    class_data = class_snapshot.to_dict() or {}
    if class_data.get("teacherId") != user["uid"]:
        raise HTTPException(status_code=403, detail="You do not own this class")

    student_ids = list(dict.fromkeys(class_data.get("studentIds", [])))
    assignments = list(
        db.collection("assignments").where("classIds", "array_contains", class_id).stream()
    )
    assignment_ids = [doc.id for doc in assignments]
    problems = []
    submissions = []
    for ids in _chunks(assignment_ids):
        problems.extend(db.collection("problems").where("assignmentId", "in", ids).stream())
        submissions.extend(db.collection("submissions").where("assignmentId", "in", ids).stream())

    problem_topics: dict[str, list[str]] = {}
    for problem in problems:
        problem_topics[problem.id] = (problem.to_dict() or {}).get("topicTags", [])
    total_problem_count = len(problem_topics)
    solved_by_student: dict[str, set[str]] = defaultdict(set)
    failed_by_student: dict[str, set[str]] = defaultdict(set)
    error_counts: Counter[str] = Counter()

    for submission in submissions:
        data = submission.to_dict() or {}
        student_id = data.get("studentId")
        problem_id = data.get("problemId")
        if student_id not in student_ids or problem_id not in problem_topics:
            continue
        if data.get("status") == "pass":
            solved_by_student[student_id].add(problem_id)
        elif data.get("status") in {"fail", "error"}:
            failed_by_student[student_id].add(problem_id)
            error = data.get("errorType") or data.get("error")
            if error:
                error_counts[str(error).splitlines()[0][:160]] += 1

    weak_topic_counts: Counter[str] = Counter()
    for student_id, failed_problem_ids in failed_by_student.items():
        for problem_id in failed_problem_ids:
            weak_topic_counts.update(problem_topics.get(problem_id, []))

    denominator = len(student_ids) * total_problem_count
    completion_rate = (
        sum(len(solved_by_student[sid]) for sid in student_ids) / denominator
        if denominator else 0.0
    )
    names: dict[str, str] = {}
    for student_id in student_ids:
        user_snapshot = db.collection("users").document(student_id).get()
        names[student_id] = (user_snapshot.to_dict() or {}).get("displayName", student_id)

    student_rates = {
        sid: len(solved_by_student[sid]) / total_problem_count if total_problem_count else 0.0
        for sid in student_ids
    }
    ranked = sorted(student_ids, key=lambda sid: (-student_rates[sid], names[sid].casefold()))
    return {
        "totalStudents": len(student_ids),
        "completionRate": round(completion_rate, 4),
        "topErrors": [error for error, _ in error_counts.most_common(5)],
        "weakTopics": [topic for topic, _ in weak_topic_counts.most_common(5)],
        "topPerformers": [names[sid] for sid in ranked[:5] if student_rates[sid] > 0],
        "strugglingStudents": [names[sid] for sid in sorted(student_ids, key=lambda sid: (student_rates[sid], names[sid].casefold()))[:5]],
    }


@router.get("/analytics/student/{user_id}", tags=["Analytics"])
async def student_analytics(user_id: str, user: dict[str, Any] = Depends(get_current_user)):
    if user_id != user["uid"]:
        raise HTTPException(status_code=403, detail="You can only view your own analytics")
    data = get_firestore().collection("studentAnalytics").document(user_id).get().to_dict() or {}
    return {
        "streak": data.get("streak", 0),
        "totalSolved": data.get("totalSolved", 0),
        "weakTopics": data.get("weakTopics", []),
        "strongTopics": data.get("strongTopics", []),
        "dailyGoalProgress": data.get("dailyGoalProgress", 0),
        "rank": data.get("rank"),
    }
