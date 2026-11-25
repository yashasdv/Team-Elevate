# 🚧 Scope and Limitations

## 1. System Scope (24-Hour Hackathon MVP)

CodeMentor AI is intentionally scoped for high impact and bulletproof demo stability during the 24-hour sprint.

### In-Scope Features
1. **Target Language:** Python 3.10+ execution only.
2. **Execution Environment:** Single-file scripts executed via the sandboxed Piston API with standard input (`stdin`) and standard output/error (`stdout`/`stderr`).
3. **Pedagogical AI Engine:** Server-side Google Gemini 2.5 Flash integration delivering 3-tier Socratic guidance (Conceptual Nudge $\rightarrow$ Targeted Clue $\rightarrow$ Algorithmic Pseudocode).
4. **Real-Time Faculty Oversight:** Live teacher lab monitor powered by Cloud Firestore `onSnapshot` subscriptions tracking student status, error types, and struggle metrics in real time.
5. **Progressive Web App (PWA):** Installable web client with standalone window mode on Windows Chrome/Edge and mobile, featuring static app-shell caching and debounced local storage draft persistence.
6. **Authentication & Authorization:** Firebase Authentication (Google SSO + Email/Password) with server-side ID token verification on FastAPI.
7. **Cloud Infrastructure:** Firebase Hosting (Frontend PWA CDN) and Render Web Service (FastAPI Backend).

### Explicit Limitations & Out-of-Scope Items
- **Multi-File Projects:** Complex multi-file directory structures (e.g., C++ CMake builds, Django apps, Java packages) are excluded.
- **Audio/Voice Mentorship:** Voice input/output is deferred to post-hackathon versions.
- **Full LMS Gradebook Sync:** Canvas/Blackboard LTI 1.3 integration is deferred to post-hackathon institutional pilots.
- **Offline Cloud Capabilities:** Offline mode provides app-shell rendering only; execution, AI hints, and live lab sync explicitly require internet connectivity.
