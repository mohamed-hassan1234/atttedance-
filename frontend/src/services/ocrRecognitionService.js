// Owns the one Tesseract.js worker used to read Student IDs off ID card
// photos. Kept separate from the camera (ocrCameraSession.js) and from the
// React flow (OcrAttendanceScanner.jsx) so each concern can be reasoned about
// and tested on its own.
//
// Recognition runs entirely in the browser (Tesseract.js's WASM engine, via a
// Web Worker it manages internally) — no card image or frame is ever sent to
// an external OCR service. Tesseract.js fetches its (public, non-sensitive)
// worker script and trained-data model from a CDN on first use the same way
// any other npm package's prebuilt binary would be fetched; the image itself
// never leaves the device.

import { createWorker } from 'tesseract.js';

const LANG = 'eng';
// Student IDs are short, fixed-shape, upper-case-and-digits tokens. Restricting
// Tesseract's character whitelist measurably improves accuracy and speed versus
// unconstrained recognition, since it never has to consider punctuation/lowercase.
const CHAR_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';

let workerPromise = null;
let activeJobs = 0;

const getWorker = () => {
  if (!workerPromise) {
    workerPromise = createWorker(LANG).then(async (worker) => {
      await worker.setParameters({
        tessedit_char_whitelist: CHAR_WHITELIST,
        // "Sparse text" — the card has a few short lines/words, not a paragraph.
        tessedit_pageseg_mode: '11',
      });
      return worker;
    });
  }
  return workerPromise;
};

// Pre-warms the worker (downloads + initializes it) before the invigilator's
// first capture, so the first real recognition isn't slower than the rest.
export const warmUp = () => {
  getWorker().catch(() => { /* surfaced on the next real recognize() call instead */ });
};

/**
 * Runs OCR on one already-preprocessed image source (canvas, ImageBitmap,
 * Blob, or data URL) and returns the recognized text plus Tesseract's mean
 * confidence (0-100). Overlapping jobs are prevented by the caller
 * (OcrCameraView's capture lock) — this function only guards against this
 * module itself being asked to do two recognitions at once, which would make
 * both slower for no benefit.
 *
 * @param {*} source Anything Tesseract.js accepts as recognize() input.
 * @returns {Promise<{ text: string, confidence: number }>}
 */
export const recognizeImage = async (source) => {
  activeJobs += 1;
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(source);
    return { text: data?.text || '', confidence: typeof data?.confidence === 'number' ? data.confidence : 0 };
  } finally {
    activeJobs -= 1;
  }
};

export const isBusy = () => activeJobs > 0;

// Frees the worker's memory. Call when leaving the scan screen for good (not
// between captures — recreating the worker per capture would be far slower).
export const terminate = async () => {
  if (!workerPromise) return;
  const pending = workerPromise;
  workerPromise = null;
  try {
    const worker = await pending;
    await worker.terminate();
  } catch {
    /* already gone */
  }
};
