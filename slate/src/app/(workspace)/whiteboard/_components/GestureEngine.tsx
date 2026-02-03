import { RefObject, useEffect, useRef, useState } from "react";
import { CanvasHandle, WorkerResponse } from "../_types";
import Camera from "./Camera";
import type { GestureRecognizerResult } from "@mediapipe/tasks-vision";
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
  const workerRef = useRef<Worker>(null);
  const lastVideoTime = useRef<number>(null);
  const isDrawing = useRef(false);
  const isWorkerBusy = useRef(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const onPredict = useCallback(
    (predictions: GestureRecognizerResult) => {
      const gesture =
        predictions.gestures && predictions.gestures[0]
          ? predictions.gestures[0][0].categoryName
          : "";
      if (gesture === "Thumb_Up" && !isDrawing.current) {
        isDrawing.current = true;
      } else if (gesture === "Thumb_Down" && isDrawing.current) {
        isDrawing.current = false;
        onDrawEnd();
      } else if (gesture === "Closed_Fist" && canvasRef.current) {
        canvasRef.current.clear();
        isDrawing.current = false;
      }

      console.log(isDrawing.current);
      if (
        isDrawing.current &&
        canvasRef.current !== null &&
        predictions.landmarks[0]
      ) {
        const indexPoints = predictions.landmarks[0][INDEX_FINGER_TIP];
        // indexPoints are camera perspective
        const transformedX = 1 - indexPoints.x;
        canvasRef.current.drawPoints(transformedX, indexPoints.y);
      }
    },
    [canvasRef, onDrawEnd],
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
          const videoBitMap = await createImageBitmap(video);
          // transfer array passes videoBitMap as pointer
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
  }, [predict, onPredict]);

  return (
    <div className="flex flex-1">
      {isLoading && <Spinner className="size-8" />}
      {error.length > 0 && <p className="accent-red-500">{error}</p>}
      <Camera
        videoRef={videoRef}
        width="640"
        height="480"
        style={{ width: "100%", height: "auto" }}
      />
    </div>
  );
}
