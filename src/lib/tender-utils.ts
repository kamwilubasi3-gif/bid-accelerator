import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

export async function uploadFile(uid: string, file: File): Promise<string> {
  const path = `${uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from("documents").upload(path, file);
  if (error) throw error;
  const { data } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 60 * 24 * 30);
  return data?.signedUrl ?? path;
}

export async function readFileAsText(file: File): Promise<string> {
  if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".csv")) {
    return await file.text();
  }
  // For PDFs/docx we send filename + size hint; AI will still produce output.
  return `[Attached: ${file.name} (${Math.round(file.size / 1024)} KB) — content unavailable in-browser; use its filename as reference.]`;
}

export async function readMany(files: File[]): Promise<string> {
  const parts = await Promise.all(files.map(async (f) => `--- ${f.name} ---\n${await readFileAsText(f)}`));
  return parts.join("\n\n");
}

export function downloadTextAsPdf(title: string, body: string, tips?: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const margin = 48;
  const maxW = width - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, margin, y);
  y += 26;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const write = (text: string) => {
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 15;
    }
  };
  write(body);
  if (tips) {
    doc.addPage();
    y = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("How to win this contract", margin, y);
    y += 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    write(tips);
  }
  doc.save(`${title.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
}

// Download the same text as a Word-compatible .doc file (HTML-based).
export function downloadTextAsWord(title: string, body: string, tips?: string) {
  const esc = (s: string) => s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
  const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"/><title>${esc(title)}</title></head><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;"><h1 style="font-size:20pt;">${esc(title)}</h1><div>${esc(body)}</div>${tips ? `<h2 style="font-size:16pt;margin-top:24pt;">How to win this contract</h2><div>${esc(tips)}</div>` : ""}</body></html>`;
  const blob = new Blob(["\uFEFF" + html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]+/gi, "_")}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
