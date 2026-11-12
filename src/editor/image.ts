const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;
const COMPRESS_ABOVE_BYTES = 900 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片格式无法识别'));
    image.src = source;
  });
}

/**
 * Images are embedded as data URLs because stage two has no asset pipeline yet.
 * Large photos are downscaled to protect localStorage and editor responsiveness.
 */
export async function imageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('图片不能超过 8 MB');

  const original = await readAsDataUrl(file);
  if (file.size <= COMPRESS_ABOVE_BYTES) return original;

  const image = await loadImage(original);
  const largestEdge = Math.max(image.naturalWidth, image.naturalHeight, 1);
  const scale = Math.min(1, MAX_IMAGE_EDGE / largestEdge);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return original;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.86);
}
