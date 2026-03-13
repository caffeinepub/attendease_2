# AttendEase

## Current State
The app has two portals: Attendance View (employee read-only) and Manager Portal (PIN: 1234). The current "face recognition" in Mark Attendance is completely fake — static bounding box overlay and manual "Mark Present" button. No actual face detection or face matching occurs. Registration captures nothing useful; face descriptors are not stored.

## Requested Changes (Diff)

### Add
- Real browser-based face recognition using `face-api.js` library (TinyFaceDetector + FaceLandmark68Net + FaceRecognitionNet models)
- Face descriptor auto-capture during registration: camera opens, auto-captures 5 face descriptors when face detected (~1.5s intervals), progress shown (Scanning 3/5...). Descriptors JSON stored as `photoData`.
- Automatic face recognition during Mark Attendance: camera scans every 500ms, extracts descriptor, matches against approved employees' stored descriptors using FaceMatcher (threshold 0.5). If matched and not marked today: auto-marks attendance + shows IDENTITY VERIFIED banner. If no match: "Face Not Recognized". No face: "Position face in front of camera".
- Models from CDN: https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights
- Loading spinner while models initialize.

### Modify
- Registration tab: auto-scan flow capturing 5 descriptors before enabling Register button.
- Mark Attendance tab: fully automatic — no manual buttons, camera detects and marks by itself. Employee list below shows today's status.
- registerEmployee mutation: pass descriptors JSON as photoData.

### Remove
- Manual "Mark Present" buttons
- Single-photo capture flow

## Implementation Plan
1. Install face-api.js npm package
2. Create useFaceAPI.ts hook loading models from CDN, cached globally
3. Rewrite registration camera in ManagerPortalPage.tsx for auto-descriptor capture
4. Rewrite FaceDetectionCamera/MarkAttendanceTab for automatic recognition + auto-mark
5. Parse photoData as face descriptor JSON in matching logic
