import { toPng, toSvg } from 'html-to-image';

export async function exportCanvasToPng(elementId: string, filename: string): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) return;

  try {
    const dataUrl = await toPng(node, { cacheBust: true, backgroundColor: '#0f172a' });
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Failed to export PNG:', err);
  }
}

export async function exportCanvasToSvg(elementId: string, filename: string): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) return;

  try {
    const dataUrl = await toSvg(node, { cacheBust: true, backgroundColor: '#0f172a' });
    const link = document.createElement('a');
    link.download = `${filename}.svg`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Failed to export SVG:', err);
  }
}
