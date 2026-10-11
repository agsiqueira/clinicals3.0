# Preserved faculty source

These screens were moved from Expo's active `app` directory for the initial
individual-learner release. They are not registered routes, must not be imported
by student screens, and do not provide access to faculty data.

- `FacultyDashboardScreen.tsx`: formerly `app/(tabs)/faculty.tsx`.
- `FacultyStudentDetailScreen.tsx`: formerly
  `app/(tabs)/faculty/student/[studentId].tsx`.

The detail screen's relative imports were adjusted for its new location. Screen
behavior and existing type errors are preserved. The shared faculty API helpers,
styles, backend router, and backend service remain source for future development.
The running backend unconditionally returns 404 for `/api/faculty`.

There is no release configuration switch to reactivate these screens or the API.
Restoring them requires a separate implementation and review of server-side
authentication, authorization, and appropriate data scope. Hiding navigation or
merely mounting the old router is not sufficient.
