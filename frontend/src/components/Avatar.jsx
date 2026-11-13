import { useEffect, useState } from 'react'
import { initialsOf } from '../utils/image.js'

// Foto de perfil redonda. Sem foto (ou se o link expirou e a imagem falhou),
// mostra as iniciais do nome.
// alt vazio por padrão: quase sempre o nome aparece escrito ao lado.
function Avatar({ url, name, size = 32, alt = '' }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [url])

  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) }

  if (url && !failed) {
    return (
      <img
        className="avatar"
        src={url}
        alt={alt}
        width={size}
        height={size}
        style={style}
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <span className="avatar avatar--initials" style={style} aria-hidden={alt ? undefined : 'true'} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
      {initialsOf(name)}
    </span>
  )
}

export default Avatar
