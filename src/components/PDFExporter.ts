import jsPDF from 'jspdf';

export async function exportToPDF(canvas: HTMLCanvasElement): Promise<void> {
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  // Calculate aspect ratio
  const ratio = canvas.width / canvas.height;

  // Set width to standard A6 width or 4 inches (101.6mm)
  // But since we want to respect the layout, let's fix the width and calculate height.
  // Standard photo strip is often 2x6 inches (50.8mm x 152.4mm).
  // If the layout is 3-up, it might be different.
  // Let's stick to A6 width but dynamic height to encompass the full strip without stretching.
  const pdfWidth = 105; // A6 width in mm
  const pdfHeight = pdfWidth / ratio;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pdfWidth, pdfHeight],
  });

  // Add the canvas image to fill the page
  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

  // Download the PDF
  pdf.save('FrozenStudio-Photobooth.pdf');
}
