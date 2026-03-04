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
  viewOnly?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

const INDEX_FINGER_TIP = 8;

export default function GestureEngine({
  canvasRef,
  onDrawEnd,
  cameraLocation,
  viewOnly = false,
  onUndo,
  onRedo,
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
  const isZooming = useRef(false);
  const zoomStartY = useRef<number | null>(null);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const smoothedAngle = useRef(0);
  const gauntletExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinnerAngleEMA = useRef<SimpleEMA | null>(null);

  const sizeExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for undo/redo callbacks so they're always fresh
  const onUndoRef = useRef(onUndo);
  const onRedoRef = useRef(onRedo);
  useEffect(() => { onUndoRef.current = onUndo; }, [onUndo]);
  useEffect(() => { onRedoRef.current = onRedo; }, [onRedo]);

  // Debounce: prevent undo/redo from firing every frame
  const lastUndoTime = useRef(0);
  const lastRedoTime = useRef(0);
  const UNDO_REDO_COOLDOWN = 500; // ms

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
      console.log(predictions)
      let gesture =
        predictions.gestures && predictions.gestures[0]
          ? predictions.gestures[0][0].categoryName
          : "";

      const customGesture = produceHighestPriorityGesture(
        predictions.landmarks,
        predictions.handedness,
      );


      // custom gestures take priority over regular ones, so we check those first
      if (customGesture) {
        gesture = customGesture;
      }

      // Handle middle pinch for panning
      if (gesture === "rightMiddlePinch") {
        // Calculate palm center for panning using middle finger tip
        const middleTip = predictions.landmarks[0][12];
        const palmCenter = {
          x:
            (predictions.landmarks[0][0].x +
              predictions.landmarks[0][5].x +
              predictions.landmarks[0][9].x +
              predictions.landmarks[0][13].x +
              predictions.landmarks[0][17].x) /
            5,
          y:
            (predictions.landmarks[0][0].y +
              predictions.landmarks[0][5].y +
              predictions.landmarks[0][9].y +
              predictions.landmarks[0][13].y +
              predictions.landmarks[0][17].y) /
            5,
        };

        // Transform coordinates (mirror horizontally)
        const transformedX = 1 - palmCenter.x;

        if (!isPanning.current) {
          canvasRef.current?.startPan(-transformedX, -palmCenter.y);
          isPanning.current = true;
        } else {
          canvasRef.current?.updatePan(-transformedX, -palmCenter.y);
        }

        // Ensure we're not drawing while panning
        isDrawing.current = false;
      } else {
        // End panning if we were panning
        if (isPanning.current) {
          canvasRef.current?.endPan();
          isPanning.current = false;
        }

        // colour wheel logic for ring pinch (disabled in view-only mode)
        if (!viewOnly && gesture === "rightRingPinch" && !isGauntlet.current) {
          if (gauntletExitTimer.current) {
            clearTimeout(gauntletExitTimer.current);
            gauntletExitTimer.current = null;
          }
          isGauntlet.current = true;
          spinnerAngleEMA.current = new SimpleEMA();
          canvasRef.current?.showSpinner(0);
          canvasRef.current?.setSpinnerStartX(predictions.landmarks[0][16].x);
        } else if (!viewOnly && gesture === "rightRingPinch" && isGauntlet.current) {
          if (gauntletExitTimer.current) {
            clearTimeout(gauntletExitTimer.current);
            gauntletExitTimer.current = null;
          }
          const rawAngle =
            (predictions.landmarks[0][16].x -
              canvasRef.current!.spinnerStartX()) *
            300;
          const smoothed = spinnerAngleEMA.current!.filter(rawAngle) as number;
          canvasRef.current?.showSpinner(smoothed);
        } else if (!viewOnly && gesture !== "rightRingPinch" && isGauntlet.current) {
          if (!gauntletExitTimer.current) {
            gauntletExitTimer.current = setTimeout(() => {
              canvasRef.current?.hideSpinner();
              isGauntlet.current = false;
              spinnerAngleEMA.current = null;
              gauntletExitTimer.current = null;
            }, 500);
          }
        }

        // size selector logic (pinky pinch — disabled in view-only mode)
        if (!viewOnly && gesture === "rightPinkyPinch" && !isSizing.current) {
          if (sizeExitTimer.current) {
            clearTimeout(sizeExitTimer.current);
            sizeExitTimer.current = null;
          }
          canvasRef.current?.showSizeSelector(0);
          canvasRef.current?.setSizeSelectorStartY(
            predictions.landmarks[0][20].y,
          );
          isSizing.current = true;
        } else if (!viewOnly && gesture === "rightPinkyPinch" && isSizing.current) {
          if (sizeExitTimer.current) {
            clearTimeout(sizeExitTimer.current);
            sizeExitTimer.current = null;
          }
          canvasRef.current?.showSizeSelector(
            (predictions.landmarks[0][20].y -
              canvasRef.current?.sizeSelectorStartY()) *
              2,
          );
        } else if (!viewOnly && gesture !== "rightPinkyPinch" && isSizing.current) {
          if (!sizeExitTimer.current) {
            sizeExitTimer.current = setTimeout(() => {
              canvasRef.current?.hideSizeSelector();
              isSizing.current = false;
              sizeExitTimer.current = null;
            }, 500);
          }
        }

        // gun gesture for zooming (right hand)
        if (gesture === "rightGun" && !isZooming.current) {
          const palmCenter = {
            x:
              (predictions.landmarks[0][0].x +
                predictions.landmarks[0][5].x +
                predictions.landmarks[0][9].x +
                predictions.landmarks[0][13].x +
                predictions.landmarks[0][17].x) /
              5,
            y:
              (predictions.landmarks[0][0].y +
                predictions.landmarks[0][5].y +
                predictions.landmarks[0][9].y +
                predictions.landmarks[0][13].y +
                predictions.landmarks[0][17].y) /
              5,
          };
          isZooming.current = true;
          zoomStartY.current = palmCenter.y;
          console.debug("rightGun START", { palmCenter });
          canvasRef.current?.startZoom(palmCenter.x, palmCenter.y);
        } else if (gesture === "rightGun" && isZooming.current) {
          const palmCenter = {
            x:
              (predictions.landmarks[0][0].x +
                predictions.landmarks[0][5].x +
                predictions.landmarks[0][9].x +
                predictions.landmarks[0][13].x +
                predictions.landmarks[0][17].x) /
              5,
            y:
              (predictions.landmarks[0][0].y +
                predictions.landmarks[0][5].y +
                predictions.landmarks[0][9].y +
                predictions.landmarks[0][13].y +
                predictions.landmarks[0][17].y) /
              5,
          };
          console.debug("rightGun UPDATE", { palmCenter });
          canvasRef.current?.updateZoom(palmCenter.x, palmCenter.y);
        } else if (gesture !== "rightGun" && isZooming.current) {
          console.debug("rightGun END");
          isZooming.current = false;
          zoomStartY.current = null;
          canvasRef.current?.endZoom();
        }

        // Handle pinch for drawing (disabled in view-only mode)
        if (!viewOnly && gesture === "rightIndexPinch") {
          isDrawing.current = true;
          console.log("pinch detected! STARTING TO DRAW");
        } else if (!viewOnly) {
          isDrawing.current = false;
          onDrawEndRef.current();
        }

        // Left hand gestures: undo/redo (disabled in view-only mode)
        if (!viewOnly && gesture === "leftIndexPinch") {
          const now = Date.now();
          if (now - lastUndoTime.current > UNDO_REDO_COOLDOWN) {
            lastUndoTime.current = now;
            onUndoRef.current?.();
          }
        }

        if (!viewOnly && gesture === "leftRingPinch") {
          const now = Date.now();
          if (now - lastRedoTime.current > UNDO_REDO_COOLDOWN) {
            lastRedoTime.current = now;
            onRedoRef.current?.();
          }
        }
      }

      // Update landmark dots (thumb + index finger) — hidden in view-only mode
      if (!viewOnly && canvasRef.current !== null && predictions.landmarks[0]) {
        const THUMB_TIP = 4;
        const thumbPoint = predictions.landmarks[0][THUMB_TIP];
        const indexPoint = predictions.landmarks[0][INDEX_FINGER_TIP];

        canvasRef.current.updateLandmarks({
          thumb: { x: 1 - thumbPoint.x, y: thumbPoint.y },
          index: { x: 1 - indexPoint.x, y: indexPoint.y },
          isPinching: isDrawing.current,
        });
      } else if (!viewOnly) {
        canvasRef.current?.updateLandmarks(null);
      }

      // Draw if pinching (and not panning, and not view-only)
      if (
        !viewOnly &&
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
    [canvasRef, viewOnly],
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
