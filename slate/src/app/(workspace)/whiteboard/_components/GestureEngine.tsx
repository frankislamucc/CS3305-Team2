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
  const isGauntlet = useRef(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const onPredict = useCallback(
    (predictions: GestureRecognizerResult) => {
      const gesture =
        predictions.gestures && predictions.gestures[0]
          ? predictions.gestures[0][0].categoryName
          : "";
          
      // if (gesture === "Thumb_Up" && !isDrawing.current && !isGauntlet.current) {
        // isDrawing.current = true;
        // canvasRef.current?.hideSpinner();
        // console.log("thumb up detected!");

      // } else if (gesture === "Thumb_Down" && isDrawing.current) {
      //   isDrawing.current = false;
      //   onDrawEnd();
      if (gesture === "Closed_Fist") {
        if (!isGauntlet.current) {
          console.log("fist detected! showing spinner");
          isGauntlet.current = true;
          isDrawing.current = false;
        } else if (isGauntlet.current && predictions.landmarks[0]) {
          console.log("gauntlet already active, updating spinner angle");
        const currentAngle = Math.atan2(
          -(predictions.landmarks[0][9].y - predictions.landmarks[0][10].y),
          predictions.landmarks[0][9].x - predictions.landmarks[0][10].x
        );
        const degrees = ((currentAngle * 180) / Math.PI + 360) % 360;
        console.log(`current angle: ${degrees.toFixed(2)} degrees`);
        canvasRef.current?.showSpinner(degrees);
        }


      } else if (gesture === "Open_Palm" && isGauntlet.current) {
        console.log("palm detected! hiding spinner");
        isGauntlet.current = false;
        canvasRef.current?.hideSpinner();
      }


      // if (
      //   isDrawing.current &&
      //   canvasRef.current !== null &&
      //   predictions.landmarks[0]
      // ) {
      //   const indexPoints = predictions.landmarks[0][INDEX_FINGER_TIP];
      //   const transformedX = 1 - indexPoints.x;
      //   canvasRef.current.drawPoints(transformedX, indexPoints.y);
      // }
    },
    [canvasRef, onDrawEnd],
  );

  const predict = useCallback(() => {
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