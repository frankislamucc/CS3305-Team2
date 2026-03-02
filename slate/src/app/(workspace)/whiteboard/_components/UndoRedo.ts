import { LineData } from "../_types";

/**
 * - `undoStack` keeps lines in the order they were added.
 * - `redoStack` holds lines that were popped via undo and can be reapplied.
 */
export class UndoRedo {
  private undoStack: LineData[] = [];
  private redoStack: LineData[] = [];

  addLine(line: LineData) {
    this.undoStack.push(line);
    this.redoStack.length = 0; // invalidate redo history
  }

  undo(): LineData | undefined {
    const line = this.undoStack.pop();
    if (line) {
      this.redoStack.push(line);
    }
    return line;
  }

  redo(): LineData | undefined {
    const line = this.redoStack.pop();
    if (line) {
      this.undoStack.push(line);
    }
    return line;
  }

  peekUndo(): LineData | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  peekRedo(): LineData | undefined {
    return this.redoStack[this.redoStack.length - 1];
  }

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
