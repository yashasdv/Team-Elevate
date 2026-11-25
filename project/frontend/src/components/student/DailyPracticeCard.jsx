import { useEffect, useMemo, useState } from 'react'

const dailyQuestions = [
  { topic: 'Variables', prompt: 'If `score = 7`, what does `score += 2` do?', options: ['Sets score to 2', 'Changes score to 9', 'Keeps score at 7'], answer: 1, explanation: 'The shorthand adds 2 to the current value and stores the result.' },
  { topic: 'Data types', prompt: 'Which value is a string in Python?', options: ['42', 'True', '"hello"'], answer: 2, explanation: 'Text inside quotes is a string.' },
  { topic: 'Operators', prompt: 'What is the result of `10 % 3`?', options: ['1', '3', '0'], answer: 0, explanation: 'The modulo operator gives the remainder. One is left over.' },
  { topic: 'Conditionals', prompt: 'When does `if age >= 18:` run?', options: ['When age is below 18', 'When age is 18 or higher', 'Only when age is 18'], answer: 1, explanation: '`>=` means greater than or equal to.' },
  { topic: 'Loops', prompt: 'How many times does `range(4)` repeat a loop?', options: ['3', '4', '5'], answer: 1, explanation: '`range(4)` produces 0, 1, 2, and 3: four values.' },
  { topic: 'Nested loops', prompt: 'An inner loop runs 2 times for each of 3 outer rounds. How many inner runs happen?', options: ['5', '6', '9'], answer: 1, explanation: 'Two inner runs happen in each of three rounds: 2 × 3 = 6.' },
  { topic: 'Lists', prompt: 'What is the first item in `colors = ["red", "blue"]`?', options: ['colors[0]', 'colors[1]', 'colors[2]'], answer: 0, explanation: 'Python lists start counting positions at index 0.' },
  { topic: 'Strings', prompt: 'What does `len("cat")` return?', options: ['2', '3', '4'], answer: 1, explanation: 'The word cat contains three characters.' },
  { topic: 'Functions', prompt: 'Which keyword sends a value back from a Python function?', options: ['print', 'input', 'return'], answer: 2, explanation: '`return` sends a result back to the code that called the function.' },
  { topic: 'Recursion', prompt: 'Why does a recursive function need a base case?', options: ['To give it a stopping point', 'To make a list', 'To repeat forever'], answer: 0, explanation: 'A base case stops the function from calling itself forever.' },
]

function todayStamp() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function readSavedQuiz(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null')
    if (!parsed || !Array.isArray(parsed.answers)) return { index: 0, answers: [], completed: false }
    return parsed
  } catch {
    return { index: 0, answers: [], completed: false }
  }
}

function topicMatches(question, topic) {
  const name = (typeof topic === 'string' ? topic : topic?.name || topic?.topic || '').toLowerCase()
  return name && question.topic.toLowerCase().includes(name) || name && name.includes(question.topic.toLowerCase())
}

export default function DailyPracticeCard({ userId, weakTopics = [], onCompleted }) {
  const questions = useMemo(() => {
    const prioritizedTopicQuestion = dailyQuestions.find((question) => weakTopics.some((topic) => topicMatches(question, topic)))
    return prioritizedTopicQuestion
      ? [prioritizedTopicQuestion, ...dailyQuestions.filter((question) => question !== prioritizedTopicQuestion)]
      : dailyQuestions
  }, [weakTopics])
  const storageKey = `codementor_daily_quiz_${userId}_${todayStamp()}`
  const [saved, setSaved] = useState(() => readSavedQuiz(storageKey))
  const [started, setStarted] = useState(() => saved.answers.length > 0 || saved.completed)
  const index = Math.min(saved.index || 0, questions.length - 1)
  const question = questions[index]
  const selected = saved.answers[index] ?? null

  useEffect(() => {
    if (saved.completed) onCompleted?.()
  }, [saved.completed, onCompleted])

  function chooseAnswer(answerIndex) {
    if (selected !== null || saved.completed) return
    const answers = [...saved.answers]
    answers[index] = answerIndex
    const nextState = { ...saved, index, answers, completed: false }
    window.localStorage.setItem(storageKey, JSON.stringify(nextState))
    setSaved(nextState)
  }

  function goNext() {
    if (selected === null) return
    if (index === questions.length - 1) {
      const nextState = { ...saved, index, completed: true }
      window.localStorage.setItem(storageKey, JSON.stringify(nextState))
      setSaved(nextState)
      onCompleted?.()
      return
    }
    const nextState = { ...saved, index: index + 1 }
    window.localStorage.setItem(storageKey, JSON.stringify(nextState))
    setSaved(nextState)
  }

  const correctCount = saved.answers.reduce((total, answer, questionIndex) => total + (answer === questions[questionIndex]?.answer ? 1 : 0), 0)

  return (
    <section className="daily-practice-card" aria-labelledby="daily-practice-title">
      <div className="daily-practice-topline"><span className="daily-practice-icon" aria-hidden="true">✦</span><span className="daily-practice-label">TODAY’S QUICK CHALLENGE</span><span className="daily-practice-goal">10 questions</span></div>
      {saved.completed ? (
        <div className="daily-quiz-complete" role="status"><span className="daily-practice-topic">10 questions · mixed topics</span><h2 id="daily-practice-title">You finished today’s quiz!</h2><p>You got {correctCount} out of {questions.length} correct. Come back tomorrow for a fresh set.</p><div className="daily-quiz-score"><strong>{correctCount}/{questions.length}</strong><span>correct answers</span></div></div>
      ) : !started ? (
        <div className="daily-quiz-intro"><span className="daily-practice-topic">Variables · loops · lists · more</span><h2 id="daily-practice-title">Build your coding confidence, one question at a time.</h2><p>Try 10 quick questions from different coding topics. You can take them at your own pace.</p><button className="daily-quiz-start" onClick={() => setStarted(true)} type="button">Start today’s MCQ <span aria-hidden="true">→</span></button></div>
      ) : (
        <div className="daily-quiz-question">
          <div className="daily-quiz-progress-row"><span>Question {index + 1} of {questions.length}</span><span>{correctCount} correct so far</span></div>
          <div className="daily-quiz-progress-track" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={index + (selected === null ? 0 : 1)}><span style={{ width: `${((index + (selected === null ? 0 : 1)) / questions.length) * 100}%` }} /></div>
          <span className="daily-practice-topic">{question.topic}</span>
          <h2 id="daily-practice-title">{question.prompt}</h2>
          <div className="daily-practice-options" role="group" aria-label="Answer choices">
            {question.options.map((option, optionIndex) => {
              const chosen = selected === optionIndex
              const correct = selected !== null && optionIndex === question.answer
              return <button aria-pressed={chosen} className={`daily-practice-option ${chosen ? (selected === question.answer ? 'answer-correct' : 'answer-incorrect') : ''} ${correct ? 'answer-reveal' : ''}`} disabled={selected !== null} key={option} onClick={() => chooseAnswer(optionIndex)} type="button"><span className="daily-option-letter">{String.fromCharCode(65 + optionIndex)}</span>{option}</button>
            })}
          </div>
          {selected !== null && <div className={`daily-practice-feedback ${selected === question.answer ? 'feedback-correct' : 'feedback-try'}`} role="status"><strong>{selected === question.answer ? 'Nice work!' : 'Good try—keep going.'}</strong><span>{question.explanation}</span><button className="daily-quiz-next" onClick={goNext} type="button">{index === questions.length - 1 ? 'Finish quiz' : 'Next question'} <span aria-hidden="true">→</span></button></div>}
        </div>
      )}
    </section>
  )
}
