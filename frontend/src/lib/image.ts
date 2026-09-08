// Compresses an image file client-side (canvas) and returns a JPEG data URL.
export const compressImageFile = (file: File, maxDimension = 1100, quality = 0.72): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Não foi possível ler o ficheiro.'));
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => reject(new Error('Formato de imagem não suportado.'));
            image.onload = () => {
                const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(image.width * scale));
                canvas.height = Math.max(1, Math.round(image.height * scale));
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Não foi possível processar a imagem.'));
                    return;
                }
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            image.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });

export const compressImageFiles = async (files: File[]): Promise<string[]> => {
    const results: string[] = [];
    for (const file of files) {
        results.push(await compressImageFile(file));
    }
    return results;
};
