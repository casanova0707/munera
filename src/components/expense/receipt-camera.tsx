"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReceiptCameraProps {
  onCapture: (imageData: string) => void;
}

export function ReceiptCamera({ onCapture }: ReceiptCameraProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = "";
  }, []);

  const confirm = useCallback(() => {
    if (preview) {
      onCapture(preview);
      setPreview(null);
    }
  }, [preview, onCapture]);

  const retake = useCallback(() => {
    setPreview(null);
    fileInputRef.current?.click();
  }, []);

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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="glass p-8 rounded-3xl border-dashed border-white/20 flex flex-col items-center justify-center gap-3 w-full hover:bg-white/5 transition-colors"
      >
        <Camera className="w-8 h-8 text-zinc-400" />
        <p className="text-sm text-zinc-400">Scan Receipt</p>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}
