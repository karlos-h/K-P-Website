// Client-side image pipeline shared by both upload paths on the site:
//
//   • processSubmissionPhoto — visitor photos headed for crowd-pov-pending
//     (CrowdPovModal.jsx)
//   • processAdminPhoto — admin event photos headed for event-photos
//     (AdminPhotoUpload.jsx)
//
// Three problems it solves:
//
//   1. EXIF stripping. Phone cameras embed GPS coordinates, so a photo taken
//      at an afterparty can carry someone's home address. Re-encoding through
//      a canvas drops all metadata — there is no path for it to survive.
//   2. HEIC normalisation. iPhones shoot HEIC by default. The bucket's mime
//      allowlist rejects it (migration 033) and browsers can't decode it
//      natively, so it has to become a JPEG here.
//   3. Size. Full-resolution DSLR JPEGs run 7-34 MB, well past what either
//      bucket accepts, and shipping originals to every gallery visitor is
//      wasteful even when they do fit.
//
// Re-encoding caps dimensions, which keeps output well under the buckets'
// size limits and consistent regardless of source.

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.85;

// Safari/iOS sometimes hands a file input an empty or generic MIME type for
// HEIC, so the filename extension is a necessary second check.
export function looksLikeHeic(file) {
  const type = (file.type || "").toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  return /\.hei[cf]$/i.test(file.name || "");
}

// heic-to carries a libheif wasm build — a few MB that most visitors never
// need, since anything from Android or a real camera is already JPEG.
// Importing on demand keeps it out of the main bundle entirely.
//
// This intermediate conversion deliberately stays on the module-level
// JPEG_QUALITY rather than a caller-supplied one: its output is decoded and
// re-encoded again below, so pinning it high avoids compounding two lossy
// passes if a caller ever asks for an aggressive final quality.
async function heicToJpeg(file) {
  const { heicTo, isHeic } = await import("heic-to");
  // Content-based check: catches a .heic extension on a file that is really
  // a JPEG, which would otherwise fail conversion for no reason.
  let confirmed = false;
  try {
    confirmed = await isHeic(file);
  } catch {
    confirmed = false;
  }
  if (!confirmed) return file;
  return heicTo({ blob: file, type: "image/jpeg", quality: JPEG_QUALITY });
}

function decodeViaImgElement(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new window.Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
    img.src = url;
  });
}

async function decode(blob) {
  // `from-image` bakes EXIF orientation into the pixels. Without it, stripping
  // the metadata would leave portrait phone photos lying on their side.
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    return decodeViaImgElement(blob);
  }
}

const UNREADABLE = "That file couldn't be read as an image. Please try a JPEG or PNG.";

/**
 * Convert any accepted upload into a metadata-free, size-capped JPEG blob.
 * Throws an Error whose message is safe to show a visitor.
 *
 * Shared core behind processSubmissionPhoto and processAdminPhoto. The
 * defaults match the crowd-pov settings, so calling this bare behaves
 * exactly as processSubmissionPhoto does — they also guard against a caller
 * passing a partial options object, where a missing maxEdge would otherwise
 * make the scale factor NaN.
 *
 * @param {File|Blob} file
 * @param {{ maxEdge?: number, quality?: number, maxBytes?: number }} [options]
 * @returns {Promise<Blob>} a JPEG blob
 */
export async function processImageFile(
  file,
  { maxEdge = MAX_EDGE, quality = JPEG_QUALITY, maxBytes = MAX_UPLOAD_BYTES } = {}
) {
  let source = file;
  let triedHeic = false;

  if (looksLikeHeic(file)) {
    source = await heicToJpeg(file);
    triedHeic = true;
  }

  let image;
  try {
    image = await decode(source);
  } catch {
    // A HEIC that arrived with no usable MIME type and no extension only
    // gives itself away here, when the browser fails to decode it.
    if (triedHeic) throw new Error(UNREADABLE);
    try {
      image = await decode(await heicToJpeg(file));
    } catch {
      throw new Error(UNREADABLE);
    }
  }

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) throw new Error(UNREADABLE);

  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  // Animated GIFs are flattened to their first frame here — canvas only ever
  // captures one. Acceptable for event photos, which is all either path takes.
  canvas.getContext("2d").drawImage(image, 0, 0, width, height);
  image.close?.();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) throw new Error("Couldn't process that photo. Please try a different one.");

  // Should be unreachable after the resize above, but a pathological image
  // could still land over the bucket's limit and get rejected by Storage.
  if (blob.size > maxBytes) {
    throw new Error("That photo is too large to upload, even after resizing. Please try another.");
  }

  return blob;
}

/**
 * Visitor-submitted crowd-pov photo → crowd-pov-pending bucket.
 * Error messages here are shown verbatim to visitors by CrowdPovModal.
 */
export async function processSubmissionPhoto(file) {
  return processImageFile(file, {
    maxEdge: MAX_EDGE,
    quality: JPEG_QUALITY,
    maxBytes: MAX_UPLOAD_BYTES,
  });
}

/**
 * Admin-uploaded event photo → event-photos bucket.
 *
 * Intentionally identical settings to processSubmissionPhoto rather than an
 * alias of it: the two paths may reasonably diverge later (admin galleries
 * could want a longer edge for full-screen viewing), and having the seam
 * already named avoids a rename at that point.
 */
export async function processAdminPhoto(file) {
  return processImageFile(file, {
    maxEdge: MAX_EDGE,
    quality: JPEG_QUALITY,
    maxBytes: MAX_UPLOAD_BYTES,
  });
}
