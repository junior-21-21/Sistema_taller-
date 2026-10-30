/** Lo más que cabe en una celda de la hoja de Google (50 000 caracteres), con margen. */
const MAX = 45_000;

/** Achica una foto del celular o la compu hasta que entre en una celda de la hoja. */
export async function shrinkPhoto(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  for (const side of [900, 720, 560, 440, 340]) {
    const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    for (const q of [0.82, 0.7, 0.58, 0.46]) {
      let url = canvas.toDataURL('image/webp', q);
      if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', q);
      if (url.length <= MAX) {
        bmp.close();
        return url;
      }
    }
  }
  bmp.close();
  throw new Error('La foto es demasiado grande.');
}

export const newFotoId = () => 'F-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
