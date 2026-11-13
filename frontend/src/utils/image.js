// Foto de perfil: recorta em quadrado (centro) e reduz para 256×256 em JPEG
// no próprio navegador, antes de enviar. Vantagens:
// - o envio fica com dezenas de kB em vez de vários MB (foto de celular);
// - redesenhar a imagem descarta os metadados do arquivo (EXIF), como a
//   localização GPS de onde a foto foi tirada.
// Se o navegador não conseguir (muito antigo), envia o arquivo original, desde
// que caiba no limite do backend.

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_SIZE = 256

export class AvatarError extends Error {
  constructor(messageKey) {
    super(messageKey)
    this.messageKey = messageKey
  }
}

export async function prepareAvatar(file, size = AVATAR_SIZE) {
  if (!file || !AVATAR_TYPES.includes(file.type)) throw new AvatarError('personal.photoInvalid')

  try {
    const bitmap = await createImageBitmap(file)
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
    bitmap.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
    if (blob) return blob
  } catch {
    // segue para o arquivo original
  }

  if (file.size > AVATAR_MAX_BYTES) throw new AvatarError('personal.photoTooLarge')
  return file
}

// "Ana Maria Souza" -> "AS"; "ana@exemplo.com" -> "A".
export function initialsOf(nameOrEmail) {
  const text = (nameOrEmail ?? '').trim()
  if (!text) return '?'
  if (text.includes('@') && !text.includes(' ')) return text[0].toUpperCase()
  const words = text.split(/\s+/)
  const first = words[0][0] ?? ''
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}
