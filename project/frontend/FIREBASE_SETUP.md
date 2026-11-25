# Firebase setup for local development

1. Use the team's shared Firebase project and register a Web app there if one is not already registered. Coordinate with the Firebase/Firestore owner so the frontend and backend use the same project.
2. In Firebase Authentication, enable **Google** and **GitHub** as sign-in providers.
3. Add `localhost` to the Authentication authorized domains.
4. For GitHub, create an OAuth app and enter its client ID and secret in the Firebase GitHub provider settings. Use the callback URL shown by Firebase.
5. Copy `.env.example` to `.env.local`, then fill in the Web app's API key, auth domain, project ID, and app ID. These are Firebase web configuration values; do not put a service-account key in this frontend project.
6. Start the app with `npm run dev` from `project/frontend`.

For a local dashboard preview without Google sign-in, set `VITE_ENABLE_DEMO_LOGIN=true` in `.env.local` and restart Vite. The preview appears only in development mode and uses sample dashboard data; it does not make backend requests.

After sign-in, the frontend checks `GET /api/auth/profile`. New students complete the form, which submits `displayName`, `college`, `year`, and the student role to `POST /api/auth/profile` with the Firebase ID token. The backend verifies the token and controls the saved role.

## Dashboard Firestore reads

The student dashboard reads:

- `studentAnalytics/{uid}` for streak and daily goal progress.
- `classes` documents where `studentIds` contains the signed-in student's UID.
- `assignments` documents where `classIds` contains one of that student's class IDs.

Firestore Security Rules must allow these reads only for the appropriate signed-in student and their classes. Coordinate the rules with the Firebase/Firestore owner; do not open the collections to every signed-in user.
