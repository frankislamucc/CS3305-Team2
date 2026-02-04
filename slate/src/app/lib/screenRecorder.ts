export type ScreenRecorderOptions = {
  withAudio?: boolean;
  videoBitsPerSecond?: number;
};

export type ScreenRecordingResult = {
  blob: Blob;
  mimeType: string;
  filename: string;
  sizeBytes: number;
  createdAt: Date;
};

export class ScreenRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;

  public isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  public async start(opts: ScreenRecorderOptions = {}): Promise<void> {
    if (this.isRecording()) throw new Error("Already recording.");

    this.chunks = [];

    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: opts.withAudio ?? true,
    });

    const mimeType = getBestMimeType();
    const mrOpts: MediaRecorderOptions = {};
    if (mimeType) mrOpts.mimeType = mimeType;
    if (opts.videoBitsPerSecond) mrOpts.videoBitsPerSecond = opts.videoBitsPerSecond;

    this.mediaRecorder = new MediaRecorder(this.stream, mrOpts);

    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };

    const videoTrack = this.stream.getVideoTracks()[0];
    videoTrack?.addEventListener("ended", () => {
      if (this.mediaRecorder?.state === "recording") this.mediaRecorder.stop();
    });

    this.mediaRecorder.start(250);
  }

  public async stop(filenameBase = "screen-recording"): Promise<ScreenRecordingResult> {
    if (!this.mediaRecorder || !this.stream) throw new Error("No active recording.");
    if (this.mediaRecorder.state !== "recording") throw new Error("Recorder is not recording.");

    const recorder = this.mediaRecorder;
    const stream = this.stream;

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.stop();
    await stopped;

    stream.getTracks().forEach((t) => t.stop());

    const mimeType = recorder.mimeType || "video/webm";
    const blob = new Blob(this.chunks, { type: mimeType });

    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];

    const createdAt = new Date();
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const filename = `${filenameBase}-${createdAt.toISOString().replace(/[:.]/g, "-")}.${ext}`;

    return { blob, mimeType, filename, sizeBytes: blob.size, createdAt };
  }

  public static download(result: ScreenRecordingResult): void {
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function getBestMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9,opus",
    "video/webm",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}
