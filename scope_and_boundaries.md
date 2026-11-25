# 🚧 Scope and Boundaries

## In-Scope for 24-Hour Hackathon MVP
1. **Authentication**: Google SSO and Email/Password via Firebase Auth for both Student and Teacher roles.
2. **Student IDE**:
   - Monaco Editor with Python syntax highlighting and autocomplete.
   - Standard I/O execution with output and error display.
   - AI Panel with Level 1-3 Socratic hints and Code Explain button.
3. **Teacher Portal**:
   - Dashboard with live class submission feed.
   - Live lab monitor with status tags: `Passed`, `In Progress`, `Needs Help` (Struggle Score > 3).
   - Assignment creation form (Title, Description, Boilerplate, Test Cases).
4. **Backend API**:
   - FastAPI endpoints for secured Gemini prompt routing and code execution proxy.
5. **Database**:
   - Firestore storing users, assignments, submissions, and telemetry events.

## Out-of-Scope (Deferred to Post-Hackathon)
- Multi-file project workspace (C++ CMake or full Django project structures; single-script Python is MVP).
- Audio/Voice AI tutor.
- Full LMS Gradebook sync (Canvas LTI).
- Paid Stripe subscription tiers.
