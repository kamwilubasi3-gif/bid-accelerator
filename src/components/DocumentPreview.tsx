import { useEffect } from "react";
import { X, Download, FileType } from "lucide-react";
import { downloadTextAsPdf, downloadTextAsWord } from "@/lib/tender-utils";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
  winning_tips?: string;
};

export function DocumentPreview({ open, onClose, title, content, winning_tips }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  // Split content into paragraphs so it looks like a real document, not raw text
  const paragraphs = content.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-2 sm:p-6 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card relative flex h-full w-full max-w-4xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card/80 p-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Preview</p>
            <h2 className="truncate text-lg font-semibold">{title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => downloadTextAsPdf(title, content, winning_tips)}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
            <button
              onClick={() => downloadTextAsWord(title, content, winning_tips)}
              className="flex items-center gap-1.5 rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              <FileType className="h-3.5 w-3.5" /> Word
            </button>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-background/40 p-4 sm:p-8">
          <article className="mx-auto max-w-3xl rounded-xl bg-card/80 p-6 shadow-xl sm:p-10">
            <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            <div className="prose prose-invert max-w-none space-y-4 text-sm leading-relaxed sm:text-base">
              {paragraphs.map((p, i) => {
                const trimmed = p.trim();
                // Heading heuristic: short line, ends without period, or ALL CAPS
                const isHeading = trimmed.length < 80 && (
                  /^[A-Z0-9][A-Z0-9 .,:&/()-]+$/.test(trimmed) ||
                  /^\d+\.\s+[A-Z]/.test(trimmed) ||
                  /^#+\s/.test(trimmed)
                );
                if (isHeading) {
                  return <h3 key={i} className="mt-6 text-lg font-bold text-primary">{trimmed.replace(/^#+\s*/, "")}</h3>;
                }
                return <p key={i} className="whitespace-pre-wrap">{trimmed}</p>;
              })}
            </div>

            {winning_tips && (
              <div className="mt-10 rounded-xl border border-primary/40 bg-primary/10 p-6">
                <h3 className="mb-3 text-lg font-bold text-primary">🏆 How to Win This Contract</h3>
                <pre className="whitespace-pre-wrap font-sans text-sm">{winning_tips}</pre>
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
