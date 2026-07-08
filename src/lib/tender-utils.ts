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
