import { RefObject, useEffect, useRef, useState } from "react";
import { CanvasHandle, WorkerResponse } from "../_types";
import Camera from "./Camera";
import type { GestureRecognizerResult } from "@mediapipe/tasks-vision";
import { Spinner } from "@/components/ui/spinner";
import { useCallback } from "react";
import {
  detectCustomGestures,
  produceHighestPriorityGesture,
} from "./CustomGestures";
import { is } from "zod/v4/locales";
import { SimpleEMA } from "./OneEuro";

interface GestureEngineProps {
  canvasRef: RefObject<CanvasHandle | null>;
  onDrawEnd: () => void;
  cameraLocation: "front" | "back";
}

const INDEX_FINGER_TIP = 8;

export default function GestureEngine({
  canvasRef,
  onDrawEnd,
  cameraLocation,
}: GestureEngineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(null);
  const workerRef = useRef<Worker>(null);
  const lastVideoTime = useRef<number>(null);
  const isDrawing = useRef(false);
  const isWorkerBusy = useRef(false);
  const isGauntlet = useRef(false);
  const isSizing = useRef(false);
  const isPanning = useRef(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const smoothedAngle = useRef(0);
  const gauntletExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinnerAngleEMA = useRef<SimpleEMA | null>(null);

  const sizeExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use a ref so the worker useEffect doesn't re-run when onDrawEnd changes
  const onDrawEndRef = useRef(onDrawEnd);
  useEffect(() => {
    onDrawEndRef.current = onDrawEnd;
  }, [onDrawEnd]);

  // clear canvas on unmount to prevent ghosting from the last frame
  useEffect(() => {
    return () => {
      if (gauntletExitTimer.current) clearTimeout(gauntletExitTimer.current);
    };
  }, []);

  const onPredict = useCallback(
    (predictions: GestureRecognizerResult) => {
      let gesture =
        predictions.gestures && predictions.gestures[0]
          ? predictions.gestures[0][0].categoryName
          : "";

      const customGesture = produceHighestPriorityGesture(
        predictions.landmarks,
      );

      // custom gestures take priority over regular ones, so we check those first
      if (customGesture) {
        gesture = customGesture;
      }

      // Handle fist for panning
      if (gesture === "rightFist" || gesture === "leftFist") {
        // Calculate palm center for panning
        const landmarks_list = predictions.landmarks[0];
        const palmCenter = {
          x:
            (landmarks_list[0].x +
              landmarks_list[5].x +
              landmarks_list[9].x +
              landmarks_list[13].x +
              landmarks_list[17].x) /
            5,
          y:
            (landmarks_list[0].y +
              landmarks_list[5].y +
              landmarks_list[9].y +
              landmarks_list[13].y +
              landmarks_list[17].y) /
            5,
        };

        // Transform coordinates (mirror horizontally)
        const transformedX = 1 - palmCenter.x;

        if (!isPanning.current) {
          // Start panning
          canvasRef.current?.startPan(transformedX, palmCenter.y);
          isPanning.current = true;
        } else {
          // Update pan
          canvasRef.current?.updatePan(transformedX, palmCenter.y);
        }

        // Ensure we're not drawing while panning
        isDrawing.current = false;
      } else {
        // End panning if we were panning
        if (isPanning.current) {
          canvasRef.current?.endPan();
          isPanning.current = false;
        }

        // colour wheel logic for ring pinch
        if (gesture === "rightRingPinch" && !isGauntlet.current) {
          if (gauntletExitTimer.current) {
            clearTimeout(gauntletExitTimer.current);
            gauntletExitTimer.current = null;
          }
          isGauntlet.current = true;
          spinnerAngleEMA.current = new SimpleEMA();
          canvasRef.current?.showSpinner(0);
          canvasRef.current?.setSpinnerStartY(predictions.landmarks[0][16].y);
        } else if (gesture === "rightRingPinch" && isGauntlet.current) {
          if (gauntletExitTimer.current) {
            clearTimeout(gauntletExitTimer.current);
            gauntletExitTimer.current = null;
          }
          const rawAngle =
            (predictions.landmarks[0][16].y -
              canvasRef.current!.spinnerStartY()) *
            300;
          const smoothed = spinnerAngleEMA.current!.filter(rawAngle) as number;
          canvasRef.current?.showSpinner(smoothed);
        } else if (gesture !== "rightRingPinch" && isGauntlet.current) {
          if (!gauntletExitTimer.current) {
            gauntletExitTimer.current = setTimeout(() => {
              canvasRef.current?.hideSpinner();
              isGauntlet.current = false;
              spinnerAngleEMA.current = null;
              gauntletExitTimer.current = null;
            }, 500);
          }
        }

        // size selector logic
        if (gesture === "rightMiddlePinch" && !isSizing.current) {
          if (sizeExitTimer.current) {
            clearTimeout(sizeExitTimer.current);
            gauntletExitTimer.current = null;
          }
          canvasRef.current?.showSizeSelector(0);
          canvasRef.current?.setSizeSelectorStartY(
            predictions.landmarks[0][12].y,
          );
          isSizing.current = true;
        } else if (gesture === "rightMiddlePinch" && isSizing.current) {
          if (sizeExitTimer.current) {
            clearTimeout(sizeExitTimer.current);
            sizeExitTimer.current = null;
          }
          canvasRef.current?.showSizeSelector(
            (predictions.landmarks[0][12].y -
              canvasRef.current?.sizeSelectorStartY()) *
              2,
          );
        } else if (gesture !== "rightMiddlePinch" && isSizing.current) {
          if (!sizeExitTimer.current) {
            sizeExitTimer.current = setTimeout(() => {
              canvasRef.current?.hideSizeSelector();
              isSizing.current = false;
              sizeExitTimer.current = null;
            }, 500);
          }
        }

        // Handle pinch for drawing
        if (gesture === "rightIndexPinch") {
          isDrawing.current = true;
          console.log("pinch detected! STARTING TO DRAW");
        } else {
          isDrawing.current = false;
          onDrawEndRef.current();
        }

        // // Handle other gestures
        // if (gesture === "rightMiddlePinch") {
        //   console.log("middle pinch detected! zooming in");
        //   canvasRef.current?.zoomIn();
        // }

        // if (gesture === "rightRingPinch") {
        //   console.log("ring pinch detected! zooming out");
        //   canvasRef.current?.zoomOut();
        // }
      }

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

      // Draw if pinching (and not panning)
      if (
        isDrawing.current &&
        !isPanning.current && // Don't draw while panning
        canvasRef.current !== null &&
        predictions.landmarks[0]?.[0]
      ) {
        const thumbPoints = predictions.landmarks[0][4];
        const indexPoints = predictions.landmarks[0][INDEX_FINGER_TIP];

        const transformedThumbX = 1 - thumbPoints.x;
        const transformedIndexX = 1 - indexPoints.x;

        canvasRef.current.drawPoints(
          transformedIndexX,
          indexPoints.y,
          isDrawing.current,
          transformedThumbX,
          thumbPoints.y,
        );
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
    <div
      className={
        cameraLocation === "front"
          ? "absolute inset-0 opacity-30 pointer-events-none z-0"
          : "absolute bottom-4 left-4 w-64 h-48 z-20 rounded-lg overflow-hidden shadow-lg"
      }
    >
      {isLoading && <Spinner className="size-8" />}
      {error.length > 0 && <p className="accent-red-500">{error}</p>}
      <Camera
        videoRef={videoRef}
        width="640"
        height="480"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)",
        }}
      />
    </div>
  );
}

