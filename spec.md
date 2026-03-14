# AttendEase

## Current State
- Two portals: AttendanceViewPage (employee read-only) and ManagerPortalPage (admin, PIN: 1234)
- Registration (manager) uses CameraSection to capture photo but sends empty photoData to backend
- FaceDetectionCamera (Mark Attendance) shows fake animated bounding box only — no real detection
- face-api.js models exist in public/models/ but the package was not installed
- Input placeholders contain "e.g." example text that user wants removed

## Requested Changes (Diff)

### Add
- `FaceRecognitionService.ts` — loads face-api.js models from /models/, exposes detectDescriptor(), compareFaces(), loadModels()
- Face descriptor capture in registration: after camera starts, auto-capture 5 face descriptors every 1.2s and store JSON in localStorage key `attendease_faces_${employeeId}`
- Real face recognition in Mark Attendance: live camera, detect every 500ms, compare against all stored descriptors, auto-mark when match found (distance < 0.55)

### Modify
- `FaceDetectionCamera.tsx` — rewrite to use FaceRecognitionService for real detection, show real bounding box from actual detection coordinates, auto-mark attendance when face matches
- `CameraSection.tsx` — add face descriptor capture mode (prop `captureDescriptors?: boolean`), auto-scan 5 times and store descriptors in localStorage on completion callback `onDescriptorsCaptured`
- `RegisterPage.tsx` — pass `captureDescriptors` to CameraSection, save descriptors to localStorage when registration succeeds
- `ManagerPortalPage.tsx` — remove all "e.g." placeholder examples from input fields; wire Mark Attendance tab to use new FaceDetectionCamera with real recognition

### Remove
- Fake confidence score animation in FaceDetectionCamera
- All "e.g. John Doe", "e.g. EMP001", "e.g. 25000" placeholder text from inputs

## Implementation Plan
1. Create `src/frontend/src/services/FaceRecognitionService.ts` with loadModels(), detectDescriptor(video), compareFaces()
2. Update CameraSection: add `autoScanDescriptors` prop; when true, after camera live starts, run detection loop capturing 5 descriptors, call `onDescriptorsCaptured(descriptors)` callback
3. Update RegisterPage: store descriptors in localStorage after successful registration
4. Rewrite FaceDetectionCamera: load all stored employee descriptors from localStorage + getAllEmployees, run detection loop, show real bounding box, auto-mark when match found
5. Update ManagerPortalPage: remove placeholder example text
