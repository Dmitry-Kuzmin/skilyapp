export async function convertHeicToJpeg(file: File, quality = 0.82): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Native HEIC decoding is not available in this browser'));
      img.src = objectUrl;
    });

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context not available');
    }

    context.drawImage(image, 0, 0, width, height);

    const convertedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('Canvas toBlob failed'));
      }, 'image/jpeg', quality);
    });

    return new File([convertedBlob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
      type: 'image/jpeg',
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
