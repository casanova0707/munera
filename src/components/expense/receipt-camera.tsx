"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReceiptCameraProps {
  onCapture: (imageData: string) => void;
}

export function ReceiptCamera({ onCapture }: ReceiptCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch {
      alert("カメラにアクセスできません");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsStreaming(false);
  }, []);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setPreview(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const confirm = useCallback(() => {
    if (preview) {
      onCapture(preview);
      setPreview(null);
    }
  }, [preview, onCapture]);

  const retake = useCallback(() => {
    setPreview(null);
    startCamera();
  }, [startCamera]);

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="relative rounded-3xl overflow-hidden">
          <img src={preview} alt="Receipt preview" className="w-full" />
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" size="md" onClick={retake} className="flex-1 gap-2">
            <RotateCcw className="w-4 h-4" /> 撮り直し
          </Button>
          <Button size="md" onClick={confirm} className="flex-1">
            この画像を使用
          </Button>
        </div>
      </div>
    );
  }

  if (isStreaming) {
    return (
      <div className="space-y-4">
        <div className="relative rounded-3xl overflow-hidden">
          <video ref={videoRef} autoPlay playsInline className="w-full" />
          <button
            onClick={() => { stopCamera(); }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <Button size="lg" onClick={capture}>
          撮影
        </Button>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  return (
    <button
      onClick={startCamera}
      className="glass p-8 rounded-3xl border-dashed border-white/20 flex flex-col items-center justify-center gap-3 w-full hover:bg-white/5 transition-colors"
    >
      <Camera className="w-8 h-8 text-zinc-400" />
      <p className="text-sm text-zinc-400">Scan Receipt</p>
    </button>
  );
}
