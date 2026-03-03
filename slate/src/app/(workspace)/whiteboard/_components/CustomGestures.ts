import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

// normalized landmarks are in the range 0-1 and have x and y properties
// in this file we take in the raw landmark data and output all the active gestures
// this is kinda the real gesture engine since it's probably clearer for GestureEngine to just call this API instead of having random logic in there

// Configuration Options - Should maybe be in a separate file!

const PINCH_THRESHOLD = 0.065;

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
  if (!RIGHT_THUMB_TIP || !RIGHT_PINKY_TIP) return false;
  return distance(RIGHT_THUMB_TIP, RIGHT_PINKY_TIP) < PINCH_THRESHOLD;
}

export function detectRightRingPinch(landmarks: NormalizedLandmark[][]): boolean {
  const { RIGHT_THUMB_TIP, RIGHT_RING_TIP } = getLandmarks(landmarks);
  if (!RIGHT_THUMB_TIP || !RIGHT_RING_TIP) return false;
  return distance(RIGHT_THUMB_TIP, RIGHT_RING_TIP) < PINCH_THRESHOLD;
}

export function detectRightMiddlePinch(landmarks: NormalizedLandmark[][]): boolean {
  const { RIGHT_THUMB_TIP, RIGHT_MIDDLE_TIP } = getLandmarks(landmarks);
  if (!RIGHT_THUMB_TIP || !RIGHT_MIDDLE_TIP) return false;
  return distance(RIGHT_THUMB_TIP, RIGHT_MIDDLE_TIP) < PINCH_THRESHOLD;
}

export function detectRightIndexPinch(landmarks: NormalizedLandmark[][]): boolean {
  const { RIGHT_THUMB_TIP, RIGHT_INDEX_TIP } = getLandmarks(landmarks);
  if (!RIGHT_THUMB_TIP || !RIGHT_INDEX_TIP) return false;
  return distance(RIGHT_THUMB_TIP, RIGHT_INDEX_TIP) < PINCH_THRESHOLD;
}

// Left Hand

// Pinching

export function detectLeftPinkyPinch(landmarks: NormalizedLandmark[][]): boolean {
  const { LEFT_THUMB_TIP, LEFT_PINKY_TIP } = getLandmarks(landmarks);
  if (!LEFT_THUMB_TIP || !LEFT_PINKY_TIP) return false;
  return distance(LEFT_THUMB_TIP, LEFT_PINKY_TIP) < PINCH_THRESHOLD;
}

export function detectLeftRingPinch(landmarks: NormalizedLandmark[][]): boolean {
  const { LEFT_THUMB_TIP, LEFT_RING_TIP } = getLandmarks(landmarks);
  if (!LEFT_THUMB_TIP || !LEFT_RING_TIP) return false;
  return distance(LEFT_THUMB_TIP, LEFT_RING_TIP) < PINCH_THRESHOLD;
}

export function detectLeftMiddlePinch(landmarks: NormalizedLandmark[][]): boolean {
  const { LEFT_THUMB_TIP, LEFT_MIDDLE_TIP } = getLandmarks(landmarks);
  if (!LEFT_THUMB_TIP || !LEFT_MIDDLE_TIP) return false;
  return distance(LEFT_THUMB_TIP, LEFT_MIDDLE_TIP) < PINCH_THRESHOLD;
}

export function detectLeftIndexPinch(landmarks: NormalizedLandmark[][]): boolean {
  const { LEFT_THUMB_TIP, LEFT_INDEX_TIP } = getLandmarks(landmarks);
  if (!LEFT_THUMB_TIP || !LEFT_INDEX_TIP) return false;
  return distance(LEFT_THUMB_TIP, LEFT_INDEX_TIP) < PINCH_THRESHOLD;
}

export function detectRightFist(landmarks: NormalizedLandmark[][]): boolean {
  const { 
    RIGHT_THUMB_TIP, RIGHT_INDEX_TIP, RIGHT_MIDDLE_TIP, RIGHT_RING_TIP, RIGHT_PINKY_TIP,
    RIGHT_THUMB_MCP, RIGHT_INDEX_MCP, RIGHT_MIDDLE_MCP, RIGHT_RING_MCP, RIGHT_PINKY_MCP,
    WRIST
  } = getLandmarks(landmarks);
  
  if (!RIGHT_THUMB_TIP || !RIGHT_INDEX_TIP || !RIGHT_MIDDLE_TIP || !RIGHT_RING_TIP || !RIGHT_PINKY_TIP) return false;
  if (!RIGHT_THUMB_MCP || !RIGHT_INDEX_MCP || !RIGHT_MIDDLE_MCP || !RIGHT_RING_MCP || !RIGHT_PINKY_MCP) return false;
  if (!WRIST) return false;
  
  // Calculate palm center as average of wrist and finger MCPs
  const palmCenter = {
    x: (WRIST.x + RIGHT_INDEX_MCP.x + RIGHT_MIDDLE_MCP.x + RIGHT_RING_MCP.x + RIGHT_PINKY_MCP.x) / 5,
    y: (WRIST.y + RIGHT_INDEX_MCP.y + RIGHT_MIDDLE_MCP.y + RIGHT_RING_MCP.y + RIGHT_PINKY_MCP.y) / 5,
    z: (WRIST.z + RIGHT_INDEX_MCP.z + RIGHT_MIDDLE_MCP.z + RIGHT_RING_MCP.z + RIGHT_PINKY_MCP.z) / 5
  };
  
  const FIST_THRESHOLD = 0.08;
  
  // Check if all finger tips are close to the palm center (using 2D distance for x,y only)
  return (
    Math.hypot(RIGHT_THUMB_TIP.x - palmCenter.x, RIGHT_THUMB_TIP.y - palmCenter.y) < FIST_THRESHOLD &&
    Math.hypot(RIGHT_INDEX_TIP.x - palmCenter.x, RIGHT_INDEX_TIP.y - palmCenter.y) < FIST_THRESHOLD &&
    Math.hypot(RIGHT_MIDDLE_TIP.x - palmCenter.x, RIGHT_MIDDLE_TIP.y - palmCenter.y) < FIST_THRESHOLD &&
    Math.hypot(RIGHT_RING_TIP.x - palmCenter.x, RIGHT_RING_TIP.y - palmCenter.y) < FIST_THRESHOLD &&
    Math.hypot(RIGHT_PINKY_TIP.x - palmCenter.x, RIGHT_PINKY_TIP.y - palmCenter.y) < FIST_THRESHOLD
  );
}

export function detectRightGun(landmarks: NormalizedLandmark[][]): boolean {
  const {
    WRIST,
    RIGHT_THUMB_TIP,
    RIGHT_INDEX_MCP,
    RIGHT_INDEX_PIP,
    RIGHT_INDEX_TIP,
    RIGHT_MIDDLE_TIP,
    RIGHT_RING_TIP,
    RIGHT_PINKY_TIP,
  } = getLandmarks(landmarks);

  // Require all key landmarks to be present
  if (
    !WRIST ||
    !RIGHT_THUMB_TIP ||
    !RIGHT_INDEX_TIP ||
    !RIGHT_INDEX_MCP ||
    !RIGHT_INDEX_PIP ||
    !RIGHT_MIDDLE_TIP ||
    !RIGHT_RING_TIP ||
    !RIGHT_PINKY_TIP
  ) {
    return false;
  }

  // Use an approximate palm center: average of wrist and index MCP
  const palmCenter = {
    x: (WRIST.x + RIGHT_INDEX_MCP.x) / 2,
    y: (WRIST.y + RIGHT_INDEX_MCP.y) / 2,
  };

  // Index should be extended away from the palm (very lenient)
  const indexDist = Math.hypot(RIGHT_INDEX_TIP.x - palmCenter.x, RIGHT_INDEX_TIP.y - palmCenter.y);
  if (indexDist < 0.10) return false; // even more relaxed

  // Middle, ring and pinky should be relatively close to the palm (curled) - very lenient
  const curledThreshold = 0.16; // much more forgiving
  if (
    Math.hypot(RIGHT_MIDDLE_TIP.x - palmCenter.x, RIGHT_MIDDLE_TIP.y - palmCenter.y) > curledThreshold ||
    Math.hypot(RIGHT_RING_TIP.x - palmCenter.x, RIGHT_RING_TIP.y - palmCenter.y) > curledThreshold ||
    Math.hypot(RIGHT_PINKY_TIP.x - palmCenter.x, RIGHT_PINKY_TIP.y - palmCenter.y) > curledThreshold
  ) {
    return false;
  }

  // Thumb should be raised (thumb tip above wrist in image coordinates) - very lenient
  if (!(RIGHT_THUMB_TIP.y < WRIST.y)) return false;

  // Index direction: pointing generally right relative to MCP (allow lots of tolerance)
  if (RIGHT_INDEX_TIP.x <= RIGHT_INDEX_MCP.x) return false;

  // Optional debug: uncomment to log detection
  // console.debug("detectRightGun: passed", { indexDist, palmCenter });

  return true;
}

export function detectCustomGestures(landmarks: NormalizedLandmark[][]) {
  return {
    rightPinkyPinch: detectRightPinkyPinch(landmarks),
    rightRingPinch: detectRightRingPinch(landmarks),
    rightMiddlePinch: detectRightMiddlePinch(landmarks),
    rightIndexPinch: detectRightIndexPinch(landmarks),
    rightGun: detectRightGun(landmarks),
    leftPinkyPinch: detectLeftPinkyPinch(landmarks),
    leftRingPinch: detectLeftRingPinch(landmarks),
    leftMiddlePinch: detectLeftMiddlePinch(landmarks),
    leftIndexPinch: detectLeftIndexPinch(landmarks),
    rightFist: detectRightFist(landmarks),
  }
}

/**
 * When multiple right-hand pinches fire at once (common because adjacent
 * fingers are close to the thumb), pick the finger whose tip is actually
 * nearest to the thumb tip.  This prevents e.g. an index-pinch from
 * stealing the middle-pinch (pan) gesture.
 */
function closestRightPinch(landmarks: NormalizedLandmark[][]): string | null {
  const hand = landmarks[0];
  if (!hand) return null;

  const thumb = hand[4]; // THUMB_TIP
  if (!thumb) return null;

  const candidates: { name: string; dist: number }[] = [
    { name: "rightIndexPinch",  dist: distance(thumb, hand[8]) },   // INDEX_TIP
    { name: "rightMiddlePinch", dist: distance(thumb, hand[12]) },  // MIDDLE_TIP
    { name: "rightRingPinch",   dist: distance(thumb, hand[16]) },  // RING_TIP
    { name: "rightPinkyPinch",  dist: distance(thumb, hand[20]) },  // PINKY_TIP
  ];

  // Only keep fingers that are within the pinch threshold
  const active = candidates.filter(c => c.dist < PINCH_THRESHOLD);
  if (active.length === 0) return null;

  // Return the one with the smallest distance
  active.sort((a, b) => a.dist - b.dist);
  return active[0].name;
}

function closestLeftPinch(landmarks: NormalizedLandmark[][]): string | null {
  const hand = landmarks[1];
  if (!hand) return null;

  const thumb = hand[4]; // THUMB_TIP
  if (!thumb) return null;

  const candidates: { name: string; dist: number }[] = [
    { name: "leftIndexPinch",  dist: distance(thumb, hand[8]) },
    { name: "leftMiddlePinch", dist: distance(thumb, hand[12]) },
    { name: "leftRingPinch",   dist: distance(thumb, hand[16]) },
    { name: "leftPinkyPinch",  dist: distance(thumb, hand[20]) },
  ];

  const active = candidates.filter(c => c.dist < PINCH_THRESHOLD);
  if (active.length === 0) return null;

  active.sort((a, b) => a.dist - b.dist);
  return active[0].name;
}

export function produceHighestPriorityGesture(landmarks: NormalizedLandmark[][]) {
  const gestures = detectCustomGestures(landmarks);

  // Gun gesture should take priority over pinches
  if (gestures.rightGun) return "rightGun";

  // For pinches, use distance-based selection so the *closest* finger wins
  const rightPinch = closestRightPinch(landmarks);
  if (rightPinch) return rightPinch;

  const leftPinch = closestLeftPinch(landmarks);
  if (leftPinch) return leftPinch;

  return false;
}
