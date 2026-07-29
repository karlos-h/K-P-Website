// Client-side pipeline every visitor-submitted photo goes through before it
// reaches the crowd-pov-pending bucket. Two problems it solves:
//
//   1. EXIF stripping. Phone cameras embed GPS coordinates, so a photo taken
//      at an afterparty can carry someone's home address. Re-encoding through
//      a canvas drops all metadata — there is no path for it to survive.
//   2. HEIC normalisation. iPhones shoot HEIC by default. The bucket's mime
//      allowlist rejects it (migration 033) and browsers can't decode it
//      natively, so it has to become a JPEG here.
//
// Re-encoding also caps dimensions, which keeps submissions well under the
// bucket's 15 MB limit and makes output consistent regardless of source.

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
 */
export async function processSubmissionPhoto(file) {
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

  const scale = Math.min(1, MAX_EDGE / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(image, 0, 0, width, height);
  image.close?.();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  if (!blob) throw new Error("Couldn't process that photo. Please try a different one.");

  // Should be unreachable after the resize above, but a pathological image
  // could still land over the bucket's limit and get rejected by Storage.
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("That photo is too large to upload, even after resizing. Please try another.");
  }

  return blob;
}
