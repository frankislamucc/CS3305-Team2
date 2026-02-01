import { CSSProperties } from "react";
import { RefObject, useEffect, useState } from "react";

interface CameraProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  width: string;
  height: string;
  style: CSSProperties;
  onLoadedData: () => void;
}

export default function Camera({
  videoRef,
  width,
  height,
  style,
  onLoadedData,
}: CameraProps) {
  const [error, setError] = useState<string>("");
  useEffect(() => {
    const startCamera = async () => {
      try {
        const video = videoRef.current;
        if (video === null) return;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        video.srcObject = stream;
        video.addEventListener("loadeddata", onLoadedData);
      } catch (err: unknown) {
        if (err instanceof DOMException) {
          switch (err.name) {
            case "NotAllowedError":
              setError(
                "Camera access was denied. Please enable it in your browser settings.",
              );
              break;
            case "NotFoundError":
              setError("No webcam detected. Please plug in a camera.");
              break;
            case "NotReadableError":
              setError("Camera is currently in use by another program.");
              break;
            default:
              setError(
                "An unexpected error occurred while starting the camera.",
              );
          }
        } else {
          setError("An unexpected error occurred while starting the camera.");
        }
      }
    };
    startCamera();
  }, [videoRef, onLoadedData]);
  return (
    <div>
      {error.length > 0 && <p className="accent-red-500">{error}</p>}
      <video
        ref={videoRef}
        width={width}
        height={height}
        style={style}
        autoPlay
      />
    </div>
  );
}
