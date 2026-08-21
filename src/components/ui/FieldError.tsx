import { AlertCircle } from "lucide-react";

/** Inline validation message shown under an input. */
export function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  );
}
