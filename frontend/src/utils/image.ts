/** Types d'images acceptés pour la photo de profil. */
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const AVATAR_MAX_BYTES = 8 * 1024 * 1024

/**
 * Recadre une image au carré (centrée) et la réduit à `size` px, en JPEG.
 * Retourne un Blob prêt à être envoyé, et une URL data: pour l'aperçu.
 */
export async function squareResize(file: File, size = 512, quality = 0.85): Promise<{ blob: Blob; dataUrl: string }> {
  if (!AVATAR_TYPES.includes(file.type)) throw new Error('Format non pris en charge (JPG, PNG ou WebP).')
  if (file.size > AVATAR_MAX_BYTES) throw new Error('Image trop lourde (8 Mo maximum).')

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Impossible de lire cette image.'))
      el.src = url
    })
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Traitement de l’image impossible sur cet appareil.')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size)
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Conversion impossible.'))), 'image/jpeg', quality),
    )
    return { blob, dataUrl }
  } finally {
    URL.revokeObjectURL(url)
  }
}
