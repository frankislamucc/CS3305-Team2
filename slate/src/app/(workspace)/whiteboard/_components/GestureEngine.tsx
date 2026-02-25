import { RefObject, useEffect, useRef, useState } from "react";
import { CanvasHandle, WorkerResponse } from "../_types";
import Camera from "./Camera";
import type { GestureRecognizerResult } from "@mediapipe/tasks-vision";
import { Spinner } from "@/components/ui/spinner";
import { useCallback } from "react";
import { detectCustomGestures, produceHighestPriorityGesture } from "./CustomGestures";

interface GestureEngineProps {
  canvasRef: RefObject<CanvasHandle | null>;
  onDrawEnd: () => void;
  cameraLocation: "front" | "back";
}

const INDEX_FINGER_TIP = 8;
export default function GestureEngine({
  canvasRef,
  onDrawEnd,
  cameraLocation
}: GestureEngineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(null);
  const workerRef = useRef<Worker>(null);
  const lastVideoTime = useRef<number>(null);
  const isDrawing = useRef(false);
  const isWorkerBusy = useRef(false);
  const isGauntlet = useRef(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Use a ref so the worker useEffect doesn't re-run when onDrawEnd changes
  const onDrawEndRef = useRef(onDrawEnd);
  useEffect(() => {
    onDrawEndRef.current = onDrawEnd;
  }, [onDrawEnd]);

  const onPredict = useCallback(
    (predictions: GestureRecognizerResult) => {
      var gesture =
        predictions.gestures && predictions.gestures[0]
          ? predictions.gestures[0][0].categoryName
          : "";

      console.log("predictions.landmarks:", predictions.landmarks);

      const customGesture = produceHighestPriorityGesture(predictions.landmarks);

      // custom gestures take priority over regular ones, so we check those first

      if (customGesture) {
        gesture = customGesture;
      }

      console.log("predicted gesture:", gesture);

      // gesture bindings here

      if (gesture === "rightIndexPinch") {

        isDrawing.current = true;
        console.log("pinch detected! STARTING TO DRAW");
      } else {
        isDrawing.current = false;
        onDrawEndRef.current();
      }

      if (gesture === "rightMiddlePinch") {
        console.log("middle pinch detected! zooming in");
        canvasRef.current?.zoomIn()
      }

      if (gesture === "rightRingPinch") {
        console.log("ring pinch detected! zooming out");
        canvasRef.current?.zoomOut()
      }

      // } else if (gesture === "Thumb_Down" && isDrawing.current) {
      //   isDrawing.current = false;
      //   onDrawEnd();
      // } else if (gesture === "Closed_Fist") {

      //   if (!isGauntlet.current) {
      //     console.log("fist detected! showing spinner");
      //     isGauntlet.current = true;
      //     isDrawing.current = false;
      //   } else if (isGauntlet.current && predictions.landmarks[0]) {
      //     console.log("gauntlet already active, updating spinner angle");
      //     const currentAngle = Math.atan2(
      //       -(predictions.landmarks[0][9].y - predictions.landmarks[0][10].y),
      //       predictions.landmarks[0][9].x - predictions.landmarks[0][10].x
      //     );
      //     const degrees = ((currentAngle * 180) / Math.PI + 360) % 360;
      //     console.log(`current angle: ${degrees.toFixed(2)} degrees`);
      //     canvasRef.current?.showSpinner(degrees);
      //   }
      // }
      // not sure about these

      // } else if (gesture === "Open_Palm" && isGauntlet.current) {
      //   console.log("palm detected! hiding spinner");
      //   isGauntlet.current = false;
      //   canvasRef.current?.hideSpinner();
      // }



      
      // Update landmark dots (thumb + index finger)
      if (canvasRef.current !== null && predictions.landmarks[0]) {
        const THUMB_TIP = 4;
        const thumbPoint = predictions.landmarks[0][THUMB_TIP];
        const indexPoint = predictions.landmarks[0][INDEX_FINGER_TIP];

        canvasRef.current.updateLandmarks({
          thumb: { x: 1 - thumbPoint.x, y: thumbPoint.y },
          index: { x: 1 - indexPoint.x, y: indexPoint.y },
          isPinching: isDrawing.current,
        });
      } else {
        canvasRef.current?.updateLandmarks(null);
      }

      if (
        isDrawing.current &&
        canvasRef.current !== null &&
        predictions.landmarks[0][0]
      ) {
        const indexPoints = predictions.landmarks[0][INDEX_FINGER_TIP];
        // indexPoints are camera perspective
        const transformedX = 1 - indexPoints.x;
        canvasRef.current.drawPoints(transformedX, indexPoints.y);
      }

    },
    [canvasRef],
  );

  // Date.now() is seen as dynamically changing
  // predict logic
  const predict = useCallback(() => {
    // to recurse on predict we need a nested func
    const runPrediction = async () => {
      const video = videoRef.current;
      if (
        workerRef.current === null ||
        video === null ||
        video.readyState < 4 ||
        isWorkerBusy.current
      ) {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(runPrediction);
        return;
      }
      const nowInMs = Date.now();
      const currentTime = video.currentTime;

      if (
        lastVideoTime.current === null ||
        currentTime !== lastVideoTime.current
      ) {
        try {
          // transfer array passes videoBitMap as pointer
          const videoBitMap = await createImageBitmap(video);
          workerRef.current.postMessage(
            {
              status: "predict",
              videoFrame: videoBitMap,
              timestamp: nowInMs,
            },
            [videoBitMap],
          );
          lastVideoTime.current = currentTime;
          isWorkerBusy.current = true;
        } catch (error: unknown) {
          if (error instanceof Error) {
            setError(`error running prediction: ${error.message}`);
          }
        }
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(runPrediction);
    };
    runPrediction();
  }, []);

  useEffect(() => {
    console.log("worker useEffect running — onPredict changed");

    workerRef.current = new Worker(
      new URL("@/workers/gesture.worker.ts", import.meta.url),
    );

    workerRef.current.onmessage = (event: MessageEvent) => {
      const response: WorkerResponse = event.data;
      if (response === null) return;
      if (response.status === "initializeSuccess") {
        setIsLoading(false);
        predict();
      } else if (
        response.status === "predictionSuccess" &&
        response.predictions
      ) {
        isWorkerBusy.current = false;
        onPredict(response.predictions);
      }
    };

    workerRef.current.postMessage({ status: "init" });
    return () => {
      workerRef.current?.terminate();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [predict]);

  return (
    <div className={
      cameraLocation === "front"
        ? "absolute inset-0 opacity-30 pointer-events-none z-0"
        : "absolute bottom-4 left-4 w-64 h-48 z-20 rounded-lg overflow-hidden shadow-lg"
    }>
      {isLoading && <Spinner className="size-8" />}
      {error.length > 0 && <p className="accent-red-500">{error}</p>}
      <Camera
        videoRef={videoRef}
        width="640"
        height="480"
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
      />
    </div>
  );
}