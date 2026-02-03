import { WorkerRequest, WorkerResponse } from "@/(workspace)/whiteboard/_types";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

let model: GestureRecognizer | null = null;

self.onmessage = async (event: MessageEvent) => {
  const request: WorkerRequest = event.data;
  if (!request) return;
  // console.log("got request");
  try {
    if (request.status === "init") {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );
      model = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task",
        },
        numHands: 1,
        runningMode: "VIDEO",
        cannedGesturesClassifierOptions: {
          maxResults: 1,
          categoryAllowlist: [
            "Closed_Fist",
            "Open_Palm",
            "Pointing_Up",
            "Thumb_Down",
            "Thumb_Up",
          ],
        },
      });
      self.postMessage({
        status: "initializeSuccess",
      });
    } else if (request.status === "predict") {
      // console.log(request);
      // console.log("received prediction request");
      // console.log(request.timestamp);
      if (model && request.videoFrame && request.timestamp) {
        // console.log("model,frame and timestamp ok");
        const results = model.recognizeForVideo(
          request.videoFrame,
          request.timestamp,
        );

        self.postMessage({ status: "predictionSuccess", predictions: results });

        // prevent memory leaks in the worker
        request.videoFrame.close();
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      self.postMessage({
        status: "error",
        error: error.message || "Unknown worker error",
      });
    }
  }
};
