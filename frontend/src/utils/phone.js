// O backend guarda o telefone no formato internacional ("+5511987654321").
// Para mostrar no campo, número brasileiro volta ao formato de sempre.

// "+5511987654321" -> "(11) 98765-4321"; "+551134567890" -> "(11) 3456-7890";
// outros países ficam como estão.
export function formatPhone(e164) {
  if (!e164) return ''
  const match = /^\+55(\d{2})(\d{4,5})(\d{4})$/.exec(e164)
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : e164
}

// Confere o básico antes de enviar (o backend valida de verdade): vazio ou
// algo com 10 a 15 dígitos, só com caracteres de telefone.
export function looksLikePhone(text) {
  const value = (text ?? '').trim()
  if (!value) return true
  if (!/^\+?[\d\s().-]+$/.test(value)) return false
  const digits = value.replace(/\D/g, '').length
  return digits >= 10 && digits <= 15
}
