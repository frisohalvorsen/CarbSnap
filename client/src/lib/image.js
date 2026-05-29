export async function fileToCompressedJpeg(file, maxDim = 1024, quality = 0.7) {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);
  const { width, height } = fit(img.width, img.height, maxDim);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = jpegDataUrl.split(",")[1];

  const thumbCanvas = document.createElement("canvas");
  const tf = fit(width, height, 320);
  thumbCanvas.width = tf.width;
  thumbCanvas.height = tf.height;
  thumbCanvas.getContext("2d").drawImage(canvas, 0, 0, tf.width, tf.height);
  const thumbDataUrl = thumbCanvas.toDataURL("image/jpeg", 0.6);

  return { base64, mediaType: "image/jpeg", dataUrl: jpegDataUrl, thumbDataUrl };
}

function fit(w, h, max) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w / h;
  if (w >= h) return { width: max, height: Math.round(max / ratio) };
  return { width: Math.round(max * ratio), height: max };
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
