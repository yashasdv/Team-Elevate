import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import './AssignmentWizard.css';

const EMPTY_TEST_CASE = { input: '', expectedOutput: '', isHidden: false };
const MAX_TEST_CASES = 30;

function normalizeTestCases(cases) {
  if (!Array.isArray(cases)) return [];
  return cases.slice(0, MAX_TEST_CASES).map((testCase) => ({
    input: String(testCase?.input ?? ''),
    expectedOutput: String(testCase?.expectedOutput ?? testCase?.expected ?? ''),
    isHidden: Boolean(testCase?.isHidden),
  }));
}

/**
 * Creates one class assignment and its linked analytics problem.
 * The app shell supplies the active Firebase user, Firestore instance, and API origin.
 */
export default function AssignmentWizard({ auth, db, user, apiBaseUrl = '' }) {
  const teacher = user ?? auth?.currentUser;
  const teacherId = teacher?.uid;
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [starterCode, setStarterCode] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [testCases, setTestCases] = useState([{ ...EMPTY_TEST_CASE }]);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [targetYear, setTargetYear] = useState('');
  const [questionCount, setQuestionCount] = useState(3);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!db || !teacherId) {
      setClasses([]);
      setClassId('');
      setLoadingClasses(false);
      return undefined;
    }

    setLoadingClasses(true);
    const ownedClasses = query(
      collection(db, 'classes'),
      where('teacherId', '==', teacherId),
    );
    return onSnapshot(
      ownedClasses,
      (snapshot) => {
        const nextClasses = snapshot.docs
          .map((classDoc) => ({ id: classDoc.id, ...classDoc.data() }))
          .sort((left, right) => (left.name ?? '').localeCompare(right.name ?? ''));
        setClasses(nextClasses);
        setClassId((currentId) => (
          nextClasses.some((item) => item.id === currentId)
            ? currentId
            : nextClasses[0]?.id ?? ''
        ));
        setLoadingClasses(false);
      },
      (snapshotError) => {
        setError(`Could not load your classes: ${snapshotError.message}`);
        setLoadingClasses(false);
      },
    );
  }, [db, teacherId]);

  function updateTestCase(index, key, value) {
    setTestCases((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )));
  }

  function addTestCase() {
    setError('');
    if (testCases.length >= MAX_TEST_CASES) {
      setError(`Assignments can contain up to ${MAX_TEST_CASES} test cases.`);
      return;
    }
    setTestCases((current) => [...current, { ...EMPTY_TEST_CASE }]);
  }

  function removeTestCase(index) {
    setTestCases((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function generateQuestions() {
    setError('');
    setNotice('');
    setGenerating(true);
    try {
      if (!teacher) throw new Error('Sign in with a teacher account to generate questions.');
      const token = await teacher.getIdToken();
      const response = await fetch(`${apiBaseUrl}/api/ai/generate-questions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic.trim(),
          difficulty,
          count: Number(questionCount),
          targetYear: targetYear.trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || 'Question generation failed. Please try again.');
      }
      const generated = Array.isArray(result.problems) ? result.problems : [];
      if (generated.length === 0) throw new Error('The AI service returned no questions.');
      setSuggestions(generated);
      setSelectedSuggestion(-1);
      setNotice(`${generated.length} question${generated.length === 1 ? '' : 's'} ready. Choose one to fill the form.`);
    } catch (requestError) {
      setError(requestError.message || 'Question generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  function useSuggestion(index) {
    const suggestion = suggestions[index];
    if (!suggestion) return;
    setSelectedSuggestion(index);
    setTitle(String(suggestion.title ?? ''));
    setDescription(String(suggestion.description ?? ''));
    setStarterCode(String(suggestion.starterCode ?? ''));
    const suggestedTests = normalizeTestCases(suggestion.testCases);
    setTestCases(suggestedTests.length > 0 ? suggestedTests : [{ ...EMPTY_TEST_CASE }]);
    setError('');
    setNotice('Question added to the assignment form. Review it and add private tests before saving.');
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setStarterCode('');
    setDueDate('');
    setTestCases([{ ...EMPTY_TEST_CASE }]);
    setSuggestions([]);
    setSelectedSuggestion(-1);
  }

  async function saveAssignment(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!teacherId || !db) {
      setError('Connect Firebase Auth and Firestore, then sign in to continue.');
      return;
    }
    if (!classId) {
      setError('Create or select a class before saving an assignment.');
      return;
    }
    setSaving(true);
    try {
      const assignmentRef = doc(collection(db, 'assignments'));
      const problemRef = doc(collection(db, 'problems'));
      const publicTestCases = testCases
        .filter((item) => !item.isHidden)
        .map(({ input, expectedOutput }) => ({ input, expectedOutput }));
      const privateTestCases = testCases.filter((item) => item.isHidden);
      const topicTags = topic.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 10);

      const assignment = {
        classId,
        classIds: [classId],
        teacherId,
        createdBy: teacherId,
        title: title.trim(),
        description: description.trim(),
        starterCode,
        publicTestCases,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (dueDate) assignment.dueDate = new Date(`${dueDate}T23:59:00`);

      const problem = {
        assignmentId: assignmentRef.id,
        classId,
        title: title.trim(),
        description: description.trim(),
        starterCode,
        topicTags,
        difficulty,
        publicTestCases,
        createdAt: serverTimestamp(),
      };

      const batch = writeBatch(db);
      batch.set(assignmentRef, assignment);
      batch.set(problemRef, problem);
      privateTestCases.forEach(({ input, expectedOutput }) => {
        const privateCaseRef = doc(collection(assignmentRef, 'private_test_cases'));
        batch.set(privateCaseRef, {
          problemId: problemRef.id,
          input,
          expectedOutput,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();

      resetForm();
      setNotice('Assignment saved. Private tests are stored in the teacher-only collection.');
    } catch (saveError) {
      setError(saveError.message || 'Could not save this assignment. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const integrationMissing = !auth || !db;
  const needsTeacherSignIn = !integrationMissing && !teacherId;

  return (
    <main className="assignment-wizard">
      <header className="assignment-wizard__header">
        <p className="assignment-wizard__eyebrow">TEACHER PORTAL / CONTENT</p>
        <h1>Assignment creator</h1>
        <p>Build a coding lab, add test cases, and optionally draft a question with AI.</p>
      </header>

      {integrationMissing && (
        <p className="assignment-wizard__message assignment-wizard__message--info" role="status">
          Connect this page to the app’s Firebase Auth and Firestore instances to create assignments.
        </p>
      )}
      {needsTeacherSignIn && (
        <p className="assignment-wizard__message assignment-wizard__message--info" role="status">
          Sign in with a teacher account to continue.
        </p>
      )}
      {error && <p className="assignment-wizard__message assignment-wizard__message--error" role="alert">{error}</p>}
      {notice && <p className="assignment-wizard__message assignment-wizard__message--success" role="status">{notice}</p>}

      <section className="assignment-wizard__panel" aria-labelledby="ai-heading">
        <div className="assignment-wizard__section-heading">
          <div>
            <p className="assignment-wizard__eyebrow">OPTIONAL</p>
            <h2 id="ai-heading">Generate a question with AI</h2>
          </div>
          <span className="assignment-wizard__spark" aria-hidden="true">✳</span>
        </div>
        <div className="assignment-wizard__ai-grid">
          <label>
            Topic
            <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. arrays, loops" maxLength={200} />
          </label>
          <label>
            Difficulty
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
          </label>
          <label>
            Learner year
            <input value={targetYear} onChange={(event) => setTargetYear(event.target.value)} placeholder="e.g. first year" maxLength={80} />
          </label>
          <label>
            Questions
            <select value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))}>
              {[1, 2, 3, 5].map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
        </div>
        <button
          className="assignment-wizard__ai-button"
          type="button"
          onClick={generateQuestions}
          disabled={!topic.trim() || generating || needsTeacherSignIn || integrationMissing}
        >
          {generating ? 'Generating…' : 'Generate questions'}
        </button>

        {suggestions.length > 0 && (
          <div className="assignment-wizard__suggestions" aria-label="Generated questions">
            {suggestions.map((suggestion, index) => (
              <article className="assignment-wizard__suggestion" key={`${suggestion.title ?? 'question'}-${index}`}>
                <div>
                  <strong>{suggestion.title || `Question ${index + 1}`}</strong>
                  <p>{suggestion.description || 'No description provided.'}</p>
                </div>
                <button
                  className="assignment-wizard__outline-button"
                  type="button"
                  onClick={() => useSuggestion(index)}
                  aria-pressed={selectedSuggestion === index}
                >
                  {selectedSuggestion === index ? 'Selected' : 'Use question'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <form className="assignment-wizard__panel" onSubmit={saveAssignment}>
        <div className="assignment-wizard__section-heading">
          <div>
            <p className="assignment-wizard__eyebrow">ASSIGNMENT DETAILS</p>
            <h2>Build the lab</h2>
          </div>
          <span className="assignment-wizard__step">01</span>
        </div>

        <div className="assignment-wizard__form-grid">
          <label className="assignment-wizard__wide">
            Class
            <select value={classId} onChange={(event) => setClassId(event.target.value)} disabled={loadingClasses || classes.length === 0} required>
              {loadingClasses && <option value="">Loading your classes…</option>}
              {!loadingClasses && classes.length === 0 && <option value="">No classes available</option>}
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name || 'Untitled class'}</option>)}
            </select>
          </label>
          <label className="assignment-wizard__wide">
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required placeholder="e.g. Array practice: find a pair" />
          </label>
          <label className="assignment-wizard__wide">
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10000} required rows={4} placeholder="Explain the task and expected input/output." />
          </label>
          <label>
            Topic tags <span className="assignment-wizard__hint">Comma separated</span>
            <input value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={200} placeholder="arrays, loops" />
          </label>
          <label>
            Due date <span className="assignment-wizard__hint">Optional</span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
          <label className="assignment-wizard__wide">
            Starter code
            <textarea className="assignment-wizard__code" value={starterCode} onChange={(event) => setStarterCode(event.target.value)} maxLength={50000} rows={8} spellCheck="false" placeholder="# Add starter code for students" />
          </label>
        </div>

        <div className="assignment-wizard__test-heading">
          <div>
            <h3>Test cases</h3>
            <p>Public cases are visible to students. Hidden cases stay teacher-only.</p>
          </div>
          <button className="assignment-wizard__outline-button" type="button" onClick={addTestCase} disabled={testCases.length >= MAX_TEST_CASES}>
            Add test case
          </button>
        </div>

        <div className="assignment-wizard__test-list">
          {testCases.map((testCase, index) => (
            <fieldset className="assignment-wizard__test-case" key={`test-${index}`}>
              <legend>Test {String(index + 1).padStart(2, '0')}</legend>
              <label>
                Input
                <textarea value={testCase.input} onChange={(event) => updateTestCase(index, 'input', event.target.value)} rows={2} maxLength={10000} />
              </label>
              <label>
                Expected output
                <textarea value={testCase.expectedOutput} onChange={(event) => updateTestCase(index, 'expectedOutput', event.target.value)} rows={2} maxLength={10000} />
              </label>
              <label>
                Visibility
                <select value={testCase.isHidden ? 'hidden' : 'public'} onChange={(event) => updateTestCase(index, 'isHidden', event.target.value === 'hidden')}>
                  <option value="public">Public</option>
                  <option value="hidden">Hidden</option>
                </select>
              </label>
              <button className="assignment-wizard__remove" type="button" onClick={() => removeTestCase(index)} disabled={testCases.length === 1} aria-label={`Remove test case ${index + 1}`}>
                Remove
              </button>
            </fieldset>
          ))}
        </div>

        <div className="assignment-wizard__footer">
          <p>Up to {MAX_TEST_CASES} test cases per assignment.</p>
          <button type="submit" disabled={saving || loadingClasses || !classId || needsTeacherSignIn || integrationMissing}>
            {saving ? 'Saving…' : 'Save assignment'}
          </button>
        </div>
      </form>
    </main>
  );
}
