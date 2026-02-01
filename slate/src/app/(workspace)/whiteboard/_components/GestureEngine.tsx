import { RefObject, useEffect, useRef, useState } from "react";
import { CanvasHandle } from "../_types";
import Camera from "./Camera";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import type { GestureRecognizer as GestureModel } from "@mediapipe/tasks-vision";
import { Spinner } from "@/components/ui/spinner";
import { useCallback } from "react";

interface GestureEngineProps {
  canvasRef: RefObject<CanvasHandle | null>;
  onDrawEnd: () => void;
}

const INDEX_FINGER_TIP = 8;
export default function GestureEngine({
  canvasRef,
  onDrawEnd,
}: GestureEngineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(null);
  const gestureModelRef = useRef<GestureModel>(null);
  const lastVideoTime = useRef<number>(null);
  const isDrawing = useRef(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // const [isDrawing, setIsDrawing] = useState(false);

  // Date.now() is seen as dynamically changing
  // onPredict logic
  const onPredict = useCallback(() => {
    const runPrediction = () => {
      const video = videoRef.current;
      if (
        gestureModelRef.current === null ||
        video === null ||
        video.readyState < 4
      ) {
        requestRef.current = requestAnimationFrame(runPrediction);
        return;
      }
      const nowInMs = Date.now();
      const currentTime = video.currentTime;

      if (
        lastVideoTime.current == null ||
        currentTime !== lastVideoTime.current
      ) {
        lastVideoTime.current = currentTime;
        const results = gestureModelRef.current.recognizeForVideo(
          video,
          nowInMs,
        );

        const gesture =
          results.gestures && results.gestures[0]
            ? results.gestures[0][0].categoryName
            : "";
        if (gesture === "Thumb_Up" && !isDrawing.current) {
          isDrawing.current = true;
          // setIsDrawing(true);
        } else if (gesture === "Thumb_Down" && isDrawing.current) {
          isDrawing.current = false;
          // setIsDrawing(false);
          onDrawEnd();
        } else if (gesture === "Closed_Fist" && canvasRef.current) {
          canvasRef.current.clear();
          isDrawing.current = false;
        }

        console.log(isDrawing.current);
        if (
          isDrawing.current &&
          canvasRef.current !== null &&
          results.landmarks[0]
        ) {
          const indexPoints = results.landmarks[0][INDEX_FINGER_TIP];
          // indexPoints are camera perspective
          const transformedX = 1 - indexPoints.x;
          canvasRef.current.drawPoints(transformedX, indexPoints.y);
        }
      }
      requestRef.current = requestAnimationFrame(runPrediction);
    };

    runPrediction();
  }, [canvasRef, onDrawEnd]);

  const cameraLoadedHandler = () => {
    requestRef.current = requestAnimationFrame(onPredict);
  };

  useEffect(() => {
    const modelSetup = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        );
        const gestureRecognizer = await GestureRecognizer.createFromOptions(
          vision,
          {
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
          },
        );
        gestureModelRef.current = gestureRecognizer;
        setIsLoading(false);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not load gesture model.";
        setError(
          `Failed to initialize gesture engine: ${message}, please check your connection`,
        );
      }
    };
    modelSetup();
  }, []);

  return (
    <div className="flex flex-1">
      {isLoading && <Spinner className="size-8" />}
      {error.length > 0 && <p className="accent-red-500">{error}</p>}
      <Camera
        videoRef={videoRef}
        width="640"
        height="480"
        style={{ width: "100%", height: "auto" }}
        onLoadedData={cameraLoadedHandler}
      />
    </div>
  );
}
