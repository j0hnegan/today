/**
 * Client-side thumbnail generation for PDFs and Word docs.
 * Renders the first page / content to a canvas, returns a Blob (PNG).
 */

const THUMB_W = 600;
const THUMB_H = 400;

/** Render the first page of a PDF to a PNG blob */
export async function generatePdfThumbnail(fileOrUrl: File | string): Promise<Blob | null> {
  try {
    const pdfjsLib = await import("pdfjs-dist");

    // Set worker source — use bundled worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    let src: ArrayBuffer | string;
    if (typeof fileOrUrl === "string") {
      src = fileOrUrl;
    } else {
      src = await fileOrUrl.arrayBuffer();
    }

    const pdf = await pdfjsLib.getDocument(
      typeof src === "string" ? { url: src } : { data: new Uint8Array(src) }
    ).promise;
    const page = await pdf.getPage(1);

    // Scale to fit THUMB_W x THUMB_H
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(THUMB_W / viewport.width, THUMB_H / viewport.height);
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport: scaledViewport } as Parameters<typeof page.render>[0]).promise;

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } catch (e) {
    console.error("PDF thumbnail generation failed:", e);
    return null;
  }
}

/** Render a Word doc (.docx) to a PNG thumbnail via mammoth → HTML → canvas */
export async function generateDocxThumbnail(file: File): Promise<Blob | null> {
  try {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();

    // Extract plain text (more reliable for canvas rendering than HTML)
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    if (!text || text.trim().length === 0) return null;

    return renderTextToBlob(text);
  } catch (e) {
    console.error("DOCX thumbnail generation failed:", e);
    return null;
  }
}

/** Render plain text onto a canvas to create a document-style thumbnail */
function renderTextToBlob(text: string): Promise<Blob | null> {
  const w = THUMB_W;
  const h = THUMB_H;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  // White background with slight page feel
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // Draw text
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textBaseline = "top";

  const padding = 24;
  const lineHeight = 20;
  const maxWidth = w - padding * 2;
  const lines = wrapText(ctx, text, maxWidth);
  const maxLines = Math.floor((h - padding * 2) / lineHeight);

  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    ctx.fillText(lines[i], padding, padding + i * lineHeight);
  }

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

/** Word-wrap text to fit within maxWidth using canvas measureText */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split(/\n+/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (para.trim() === "") {
      lines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

/** Generate thumbnail for a file based on its MIME type. Returns the PNG blob or null. */
export async function generateThumbnail(
  file: File,
  mime: string
): Promise<Blob | null> {
  if (mime === "application/pdf") {
    return generatePdfThumbnail(file);
  }
  if (
    mime === "application/msword" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return generateDocxThumbnail(file);
  }
  return null;
}
