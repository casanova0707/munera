import { Inbox } from "lucide-react";

interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  message = "データがありません",
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
      {icon ?? <Inbox className="w-12 h-12 mb-4 text-zinc-700" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}
