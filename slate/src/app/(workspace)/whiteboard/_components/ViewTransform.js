export class ViewTransform {
    constructor() {
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.minScale = 0.5;
        this.maxScale = 3.0;
        this.panSpeed = 1.5;
        this.onChangeCallback = null;
    }

  setOnChangeCallback(callback) {
    this.onChangeCallback = callback;
  }

  notifyChange() {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  screenToCanvas(screenX, screenY) {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale
    };
  }

  canvasToScreen(canvasX, canvasY) {
    return {
      x: canvasX * this.scale + this.offsetX,
      y: canvasY * this.scale + this.offsetY
    };
  }

  zoomAtPoint(factor, pointX, pointY) {
    const oldScale = this.scale;
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));

    if (oldScale !== newScale) {
      this.offsetX = pointX - (pointX - this.offsetX) * (newScale / oldScale);
      this.offsetY = pointY - (pointY - this.offsetY) * (newScale / oldScale);
      this.scale = newScale;
      this.notifyChange();
    }
  }

  pan(deltaX, deltaY) {
    this.offsetX += deltaX * this.panSpeed;
    this.offsetY += deltaY * this.panSpeed;
    this.notifyChange();
  }

  reset() {
    this.scale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.notifyChange();
  }
}