import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

// normalized landmarks are in the range 0-1 and have x and y properties
// in this file we take in the raw landmark data and output all the active gestures
// this is kinda the real gesture engine since it's probably clearer for GestureEngine to just call this API instead of having random logic in there

// Configuration Options - Should maybe be in a separate file!

const PINCH_THRESHOLD = 0.1;

// this function just lets us use the shorthand in this file
function getLandmarks(landmarks: NormalizedLandmark[][]) {
  const right = landmarks[0] ?? null;
  const left = landmarks[1] ?? null;

  return {
    WRIST: right?.[0],

    RIGHT_THUMB_CMC: right?.[1],
    RIGHT_THUMB_MCP: right?.[2],
    RIGHT_THUMB_IP: right?.[3],
    RIGHT_THUMB_TIP: right?.[4],

    RIGHT_INDEX_MCP: right?.[5],
    RIGHT_INDEX_PIP: right?.[6],
    RIGHT_INDEX_DIP: right?.[7],
    RIGHT_INDEX_TIP: right?.[8],

    RIGHT_MIDDLE_MCP: right?.[9],
    RIGHT_MIDDLE_PIP: right?.[10],
    RIGHT_MIDDLE_DIP: right?.[11],
    RIGHT_MIDDLE_TIP: right?.[12],

    RIGHT_RING_MCP: right?.[13],
    RIGHT_RING_PIP: right?.[14],
    RIGHT_RING_DIP: right?.[15],
    RIGHT_RING_TIP: right?.[16],

    RIGHT_PINKY_MCP: right?.[17],
    RIGHT_PINKY_PIP: right?.[18],
    RIGHT_PINKY_DIP: right?.[19],
    RIGHT_PINKY_TIP: right?.[20],

    LEFT_WRIST: left?.[0],

    LEFT_THUMB_CMC: left?.[1],
    LEFT_THUMB_MCP: left?.[2],
    LEFT_THUMB_IP: left?.[3],
    LEFT_THUMB_TIP: left?.[4],

    LEFT_INDEX_MCP: left?.[5],
    LEFT_INDEX_PIP: left?.[6],
    LEFT_INDEX_DIP: left?.[7],
    LEFT_INDEX_TIP: left?.[8],

    LEFT_MIDDLE_MCP: left?.[9],
    LEFT_MIDDLE_PIP: left?.[10],
    LEFT_MIDDLE_DIP: left?.[11],
    LEFT_MIDDLE_TIP: left?.[12],

    LEFT_RING_MCP: left?.[13],
    LEFT_RING_PIP: left?.[14],
    LEFT_RING_DIP: left?.[15],
    LEFT_RING_TIP: left?.[16],

    LEFT_PINKY_MCP: left?.[17],
    LEFT_PINKY_PIP: left?.[18],
    LEFT_PINKY_DIP: left?.[19],
    LEFT_PINKY_TIP: left?.[20],
  };
}

function distance(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// these should maybe not be exported

// Right Hand

// Pinching

export function detectRightPinkyPinch(landmarks: NormalizedLandmark[][]): boolean {
  const { RIGHT_THUMB_TIP, RIGHT_PINKY_TIP } = getLandmarks(landmarks);
  // check if they are available first, if not return false
  if (!RIGHT_THUMB_TIP || !RIGHT_PINKY_TIP) return false;
  // Check if thumb and index are close enough to be considered "pinching"
  // Check if both X and Y distances are below threshold
  return Math.abs(RIGHT_THUMB_TIP.x - RIGHT_PINKY_TIP.x) < PINCH_THRESHOLD && Math.abs(RIGHT_THUMB_TIP.y - RIGHT_PINKY_TIP.y) < PINCH_THRESHOLD
}

export function detectRightRingPinch(landmarks: NormalizedLandmark[][]): boolean {
  const { RIGHT_THUMB_TIP, RIGHT_RING_TIP } = getLandmarks(landmarks);
  if (!RIGHT_THUMB_TIP || !RIGHT_RING_TIP) return false;
  return Math.abs(RIGHT_THUMB_TIP.x - RIGHT_RING_TIP.x) < PINCH_THRESHOLD && Math.abs(RIGHT_THUMB_TIP.y - RIGHT_RING_TIP.y) < PINCH_THRESHOLD
}

export function detectRightMiddlePinch(landmarks: NormalizedLandmark[][]): boolean {
  const { RIGHT_THUMB_TIP, RIGHT_MIDDLE_TIP } = getLandmarks(landmarks);
  if (!RIGHT_THUMB_TIP || !RIGHT_MIDDLE_TIP) return false;
  return Math.abs(RIGHT_THUMB_TIP.x - RIGHT_MIDDLE_TIP.x) < PINCH_THRESHOLD && Math.abs(RIGHT_THUMB_TIP.y - RIGHT_MIDDLE_TIP.y) < PINCH_THRESHOLD
}

export function detectRightIndexPinch(landmarks: NormalizedLandmark[][]): boolean {
  const { RIGHT_THUMB_TIP, RIGHT_INDEX_TIP } = getLandmarks(landmarks);
  if (!RIGHT_THUMB_TIP || !RIGHT_INDEX_TIP) return false;
  return Math.abs(RIGHT_THUMB_TIP.x - RIGHT_INDEX_TIP.x) < PINCH_THRESHOLD && Math.abs(RIGHT_THUMB_TIP.y - RIGHT_INDEX_TIP.y) < PINCH_THRESHOLD
}

// Left Hand

// Pinching

export function detectLeftPinkyPinch(landmarks: NormalizedLandmark[][]): boolean {
  const { LEFT_THUMB_TIP, LEFT_PINKY_TIP } = getLandmarks(landmarks);
  if (!LEFT_THUMB_TIP || !LEFT_PINKY_TIP) return false;
  return Math.abs(LEFT_THUMB_TIP.x - LEFT_PINKY_TIP.x) < PINCH_THRESHOLD && Math.abs(LEFT_THUMB_TIP.y - LEFT_PINKY_TIP.y) < PINCH_THRESHOLD
}

export function detectLeftRingPinch(landmarks: NormalizedLandmark[][]): boolean {
  const { LEFT_THUMB_TIP, LEFT_RING_TIP } = getLandmarks(landmarks);
  if (!LEFT_THUMB_TIP || !LEFT_RING_TIP) return false;
  return Math.abs(LEFT_THUMB_TIP.x - LEFT_RING_TIP.x) < PINCH_THRESHOLD && Math.abs(LEFT_THUMB_TIP.y - LEFT_RING_TIP.y) < PINCH_THRESHOLD
}

export function detectLeftMiddlePinch(landmarks: NormalizedLandmark[][]): boolean {
  const { LEFT_THUMB_TIP, LEFT_MIDDLE_TIP } = getLandmarks(landmarks);
  if (!LEFT_THUMB_TIP || !LEFT_MIDDLE_TIP) return false;
  return Math.abs(LEFT_THUMB_TIP.x - LEFT_MIDDLE_TIP.x) < PINCH_THRESHOLD && Math.abs(LEFT_THUMB_TIP.y - LEFT_MIDDLE_TIP.y) < PINCH_THRESHOLD
}

export function detectLeftIndexPinch(landmarks: NormalizedLandmark[][]): boolean {
  const { LEFT_THUMB_TIP, LEFT_INDEX_TIP } = getLandmarks(landmarks);
  if (!LEFT_THUMB_TIP || !LEFT_INDEX_TIP) return false;
  return Math.abs(LEFT_THUMB_TIP.x - LEFT_INDEX_TIP.x) < PINCH_THRESHOLD && Math.abs(LEFT_THUMB_TIP.y - LEFT_INDEX_TIP.y) < PINCH_THRESHOLD
}

export function detectCustomGestures(landmarks: NormalizedLandmark[][]) {
  return {
    rightPinkyPinch: detectRightPinkyPinch(landmarks),
    rightRingPinch: detectRightRingPinch(landmarks),
    rightMiddlePinch: detectRightMiddlePinch(landmarks),
    rightIndexPinch: detectRightIndexPinch(landmarks),
    leftPinkyPinch: detectLeftPinkyPinch(landmarks),
    leftRingPinch: detectLeftRingPinch(landmarks),
    leftMiddlePinch: detectLeftMiddlePinch(landmarks),
    leftIndexPinch: detectLeftIndexPinch(landmarks),
  }
}

export function produceHighestPriorityGesture(landmarks: NormalizedLandmark[][]) {
  const gestures = detectCustomGestures(landmarks);
  // priority list - random rn
  if (gestures.rightPinkyPinch) return "rightPinkyPinch";
  if (gestures.rightRingPinch) return "rightRingPinch";
  if (gestures.rightMiddlePinch) return "rightMiddlePinch";
  if (gestures.rightIndexPinch) return "rightIndexPinch";
  if (gestures.leftPinkyPinch) return "leftPinkyPinch";
  if (gestures.leftRingPinch) return "leftRingPinch";
  if (gestures.leftMiddlePinch) return "leftMiddlePinch";
  if (gestures.leftIndexPinch) return "leftIndexPinch";
  else return false;
}
