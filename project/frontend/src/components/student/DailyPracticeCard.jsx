import { useEffect, useMemo, useState } from 'react'

const dailyQuestions = [
  {
    topic: 'Recursion',
    tags: ['recursion', 'recursive'],
    prompt: 'Why does a recursive function need a base case?',
    options: ['To stop the repeated calls', 'To make the function run faster every time', 'To create a new variable'],
    answer: 0,
    explanation: 'The base case gives the function a stopping point, so it does not keep calling itself forever.',
  },
  {
    topic: 'Nested loops',
    tags: ['nested loop', 'nested-loop', '2d loop'],
    prompt: 'If an inner loop runs 3 times for each of 2 outer-loop rounds, how many inner-loop runs happen?',
    options: ['3', '5', '6'],
    answer: 2,
    explanation: 'The inner loop runs 3 times in each of 2 rounds: 3 × 2 = 6.',
  },
  {
    topic: 'Loops',
    tags: ['loop', 'iteration', 'for loop', 'while loop'],
    prompt: 'In Python, what values does `range(1, 4)` produce?',
    options: ['1, 2, 3', '1, 2, 3, 4', '0, 1, 2, 3'],
    answer: 0,
    explanation: 'The stop value is not included, so range(1, 4) produces 1, 2, and 3.',
  },
  {
    topic: 'Conditionals',
    tags: ['condition', 'conditional', 'if statement', 'branch'],
    prompt: 'When does `if score >= 50:` run its indented block?',
    options: ['Only when score is less than 50', 'When score is 50 or more', 'Only when score equals 0'],
    answer: 1,
    explanation: 'The >= operator means “greater than or equal to,” so 50 itself passes the check.',
  },
  {
    topic: 'Variables',
    tags: ['variable', 'assignment'],
    prompt: 'If `count` is 4, what does `count = count + 1` do?',
    options: ['Changes count to 5', 'Changes count to 1', 'Leaves count at 4'],
    answer: 0,
    explanation: 'It reads the current value, adds one, then stores the new value back in count.',
  },
]

function selectQuestion(weakTopics = []) {
  const names = weakTopics.map((topic) => (typeof topic === 'string' ? topic : topic.name || topic.topic || '').toLowerCase())
  return dailyQuestions.find((question) => question.tags.some((tag) => names.some((name) => name.includes(tag)))) || dailyQuestions[2]
}

function todayStamp() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function savedAnswer(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || 'null')
    return Number.isInteger(value?.selected) ? value : null
  } catch {
    return null
  }
}

export default function DailyPracticeCard({ userId, weakTopics = [], onCompleted }) {
  const question = useMemo(() => selectQuestion(weakTopics), [weakTopics])
  const storageKey = `codementor_daily_question_${userId}_${todayStamp()}_${question.topic.toLowerCase().replace(/\s+/g, '-')}`
  const [saved, setSaved] = useState(() => savedAnswer(storageKey))
  const [selected, setSelected] = useState(saved?.selected ?? null)
  const answered = selected !== null
  const isCorrect = selected === question.answer

  useEffect(() => {
    if (saved) onCompleted?.(true)
  }, [saved, onCompleted])

  function chooseAnswer(index) {
    if (answered) return
    const result = { selected: index, correct: index === question.answer }
    window.localStorage.setItem(storageKey, JSON.stringify(result))
    setSaved(result)
    setSelected(index)
    onCompleted?.(true)
  }

  return (
    <section className="daily-practice-card" aria-labelledby="daily-practice-title">
      <div className="daily-practice-topline"><span className="daily-practice-icon" aria-hidden="true">✦</span><span className="daily-practice-label">TODAY’S QUICK CHALLENGE</span><span className="daily-practice-goal">1 question</span></div>
      <span className="daily-practice-topic">Picked for {question.topic}</span>
      <h2 id="daily-practice-title">{question.prompt}</h2>
      <div className="daily-practice-options" role="group" aria-label="Answer choices">
        {question.options.map((option, index) => {
          const chosen = selected === index
          const answer = answered && index === question.answer
          return (
            <button
              aria-pressed={chosen}
              className={`daily-practice-option ${chosen ? (isCorrect ? 'answer-correct' : 'answer-incorrect') : ''} ${answer ? 'answer-reveal' : ''}`}
              disabled={answered}
              key={option}
              onClick={() => chooseAnswer(index)}
              type="button"
            ><span className="daily-option-letter">{String.fromCharCode(65 + index)}</span>{option}</button>
          )
        })}
      </div>
      {answered ? <div className={`daily-practice-feedback ${isCorrect ? 'feedback-correct' : 'feedback-try'}`} role="status"><strong>{isCorrect ? 'Nice work!' : 'Good try—keep learning.'}</strong><span>{question.explanation}</span>{!saved?.correct && <small>The correct answer is {String.fromCharCode(65 + question.answer)}.</small>}</div> : <p className="daily-practice-hint">A quick question each day helps build a strong habit.</p>}
    </section>
  )
}
