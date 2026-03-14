import * as faceapi from "face-api.js";

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const MODEL_URL = "/models";
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  })();
  return loadingPromise;
}

export async function detectFaceWithBox(video: HTMLVideoElement): Promise<{
  descriptor: Float32Array;
  box: { x: number; y: number; width: number; height: number };
} | null> {
  if (video.readyState < 2 || video.videoWidth === 0) return null;
  try {
    const detection = await faceapi
      .detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 224,
          scoreThreshold: 0.3,
        }),
      )
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) return null;
    const { x, y, width, height } = detection.detection.box;
    return { descriptor: detection.descriptor, box: { x, y, width, height } };
  } catch {
    return null;
  }
}

export async function detectFaceDescriptorOnly(
  video: HTMLVideoElement,
): Promise<Float32Array | null> {
  const result = await detectFaceWithBox(video);
  return result ? result.descriptor : null;
}

export function euclideanDistance(d1: Float32Array, d2: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < d1.length; i++) sum += (d1[i] - d2[i]) ** 2;
  return Math.sqrt(sum);
}

export function storeFaceDescriptors(
  employeeId: string,
  descriptors: Float32Array[],
): void {
  const data = descriptors.map((d) => Array.from(d));
  localStorage.setItem(`attendease_faces_${employeeId}`, JSON.stringify(data));
}

export function loadFaceDescriptors(employeeId: string): Float32Array[] {
  const raw = localStorage.getItem(`attendease_faces_${employeeId}`);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as number[][];
    return data.map((d) => new Float32Array(d));
  } catch {
    return [];
  }
}

export function matchFaceToEmployee(
  descriptor: Float32Array,
  storedDescriptors: Float32Array[],
): number {
  if (storedDescriptors.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(
    ...storedDescriptors.map((d) => euclideanDistance(descriptor, d)),
  );
}
