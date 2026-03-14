import * as faceapiLib from "face-api.js";

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

const MODEL_URL = "/models";

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    await Promise.all([
      faceapiLib.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapiLib.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapiLib.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  })();

  return loadingPromise;
}

export const faceapi = faceapiLib;

export function useFaceAPI() {
  return { loadFaceModels, faceapi };
}
