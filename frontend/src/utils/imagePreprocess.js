// Canvas-based preprocessing for OCR captures. Cropping to the on-screen
// guide frame, upscaling, converting to grayscale and thresholding measurably
// improves Tesseract's accuracy on a photographed ID card versus feeding it
// the raw camera frame, and is far cheaper than running OCR on every frame.

// Student ID text is small relative to the whole card; recognizing it
// reliably needs the cropped region rendered at a reasonable pixel size.
const MIN_OUTPUT_WIDTH = 900;

/**
 * @param {HTMLVideoElement} video
 * @param {{ x: number, y: number, width: number, height: number }} cropRatio
 *   The guide frame's position as a fraction (0-1) of the video's displayed
 *   area, e.g. the centered box QrScanner-style overlays draw.
 * @returns {HTMLCanvasElement} a grayscale, contrast-boosted, upscaled canvas
 *   ready to hand to Tesseract.
 */
export const captureIdRegion = (video, cropRatio) => {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) throw new Error('Video has no frame to capture yet.');

  // `cropRatio` is a fraction of the *displayed* box, but the <video> is
  // rendered with `object-fit: cover`, which uniformly scales the native
  // frame up and clips whichever axis overflows to fill that box — e.g. a
  // 4:3 native camera frame inside a 3:4 portrait preview has its left/right
  // edges clipped. Mapping cropRatio directly onto the native vw/vh (as if
  // the whole native frame were shown 1:1) would crop a different, shifted
  // region than what the invigilator actually sees framed, so the image
  // handed to OCR might not contain the aligned text at all. Map the
  // on-screen fraction back through the same cover scale/offset instead.
  const dw = video.clientWidth || vw;
  const dh = video.clientHeight || vh;
  const coverScale = Math.max(dw / vw, dh / vh);
  const visibleW = dw / coverScale; // native pixels actually visible on screen
  const visibleH = dh / coverScale;
  const offsetX = (vw - visibleW) / 2; // native pixels clipped off each side
  const offsetY = (vh - visibleH) / 2;

  const sx = Math.round(offsetX + cropRatio.x * visibleW);
  const sy = Math.round(offsetY + cropRatio.y * visibleH);
  const sw = Math.round(cropRatio.width * visibleW);
  const sh = Math.round(cropRatio.height * visibleH);

  const scale = Math.max(1, MIN_OUTPUT_WIDTH / sw);
  const outW = Math.round(sw * scale);
  const outH = Math.round(sh * scale);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);

  applyGrayscaleThreshold(ctx, outW, outH);
  return canvas;
};

// Grayscale + adaptive-ish threshold (Otsu-lite: mean-based) turns printed
// black text on a light card background into crisp black-on-white, which is
// what Tesseract is tuned for. Skipped silently if pixel data can't be read
// (e.g. a tainted canvas) — OCR still runs on the un-thresholded image.
function applyGrayscaleThreshold(ctx, width, height) {
  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return;
  }
  const { data } = imageData;
  const gray = new Uint8ClampedArray(width * height);
  let sum = 0;

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = g;
    sum += g;
  }
  const mean = sum / gray.length;
  // Text is usually darker than the card background, so bias the cut point
  // slightly below the mean rather than splitting exactly at it.
  const threshold = mean * 0.9;

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const value = gray[p] >= threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);
}
