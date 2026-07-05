import { Link } from "@tanstack/react-router";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-foreground text-background shadow-sm">
        <span className="text-[13px] font-bold tracking-tight">B</span>
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand shadow-[0_0_10px_2px_var(--brand)]" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        ByteBack <span className="text-muted-foreground">Inbox AI</span>
      </span>
    </span>
  );
}

export function BrandLink() {
  return (
    <Link to="/" className="group">
      <BrandMark />
    </Link>
  );
}
