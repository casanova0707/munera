import { Loader2 } from "lucide-react";

export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      {message && <p className="text-xs text-zinc-500 mt-3">{message}</p>}
    </div>
  );
}
