function loadImage(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = (error) => {
            URL.revokeObjectURL(objectUrl);
            reject(error);
        };
        image.src = objectUrl;
    });
}

export async function compressClientFile(file, options = {}) {
    if (!file || !file.type?.startsWith('image/')) {
        return file;
    }

    const {
        maxWidth = 1600,
        maxHeight = 1600,
        quality = 0.78,
    } = options;

    const image = await loadImage(file);
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const width = Math.round(image.width * scale);
    const height = Math.round(image.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) {
        return file;
    }

    const filename = file.name.replace(/\.[^.]+$/, '.jpg');
    return new File([blob], filename, {
        type: 'image/jpeg',
        lastModified: Date.now(),
    });
}
