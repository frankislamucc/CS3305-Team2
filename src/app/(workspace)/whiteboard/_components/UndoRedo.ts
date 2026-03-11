import { LineData, CircleData, TextData, ArrowData } from "../_types";

export type UndoAction =
  | { type: "addLine"; line: LineData }
  | { type: "addLines"; lines: LineData[] }
  | { type: "clearCanvas"; lines: LineData[]; circles: CircleData[]; texts: TextData[]; arrows: ArrowData[] }
  | { type: "replaceAll"; oldLines: LineData[]; newLines: LineData[] };

/**
 * Action-based undo/redo system.
 *
 * Each entry on the stacks is an action that describes what happened:
 * - `addLine`      – a single stroke was drawn
 * - `addLines`     – multiple strokes added at once (e.g. paste)
 * - `clearCanvas`  – the canvas was cleared; stores the lines that were removed
 */
export class UndoRedo {
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];

  /** Record a single drawn line. */
  addLine(line: LineData) {
    this.undoStack.push({ type: "addLine", line });
    this.redoStack.length = 0;
  }

  /** Record a batch of lines added at once (e.g. paste). */
  addLines(lines: LineData[]) {
    if (lines.length === 0) return;
    this.undoStack.push({ type: "addLines", lines: [...lines] });
    this.redoStack.length = 0;
  }

  /** Record a "clear canvas" action so it can be undone. */
  clearCanvas(currentLines: LineData[], currentCircles: CircleData[] = [], currentTexts: TextData[] = [], currentArrows: ArrowData[] = []) {
    if (currentLines.length === 0 && currentCircles.length === 0 && currentTexts.length === 0 && currentArrows.length === 0) return;
    this.undoStack.push({ type: "clearCanvas", lines: [...currentLines], circles: [...currentCircles], texts: [...currentTexts], arrows: [...currentArrows] });
    this.redoStack.length = 0;
  }

  /** Record a bulk replacement (e.g. cut). */
  replaceAll(oldLines: LineData[], newLines: LineData[]) {
    this.undoStack.push({ type: "replaceAll", oldLines: [...oldLines], newLines: [...newLines] });
    this.redoStack.length = 0;
  }

  undo(): UndoAction | undefined {
    const action = this.undoStack.pop();
    if (action) {
      this.redoStack.push(action);
    }
    return action;
  }

  redo(): UndoAction | undefined {
    const action = this.redoStack.pop();
    if (action) {
      this.undoStack.push(action);
    }
    return action;
  }

  peekUndo(): UndoAction | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  peekRedo(): UndoAction | undefined {
    return this.redoStack[this.redoStack.length - 1];
  }

  /** Fully reset history (used when switching canvases). */
  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  getUndoCount(): number {
    return this.undoStack.length;
  }

  getRedoCount(): number {
    return this.redoStack.length;
  }
}
