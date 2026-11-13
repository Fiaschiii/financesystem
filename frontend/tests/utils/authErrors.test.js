import { describe, it, expect } from 'vitest'
import { translateAuthError } from '../../src/utils/authErrors.js'

describe('translateAuthError', () => {
  it('traduz mensagens conhecidas do Supabase', () => {
    expect(translateAuthError('Invalid login credentials')).toBe('E-mail ou senha incorretos.')
    expect(translateAuthError('User already registered')).toBe('Esse e-mail já está cadastrado.')
    expect(translateAuthError('Email not confirmed')).toMatch(/Confirme seu e-mail/)
  })

  it('usa o número que vem na mensagem', () => {
    expect(translateAuthError('Password should be at least 8 characters.')).toBe(
      'A senha precisa ter pelo menos 8 caracteres.'
    )
    expect(
      translateAuthError('For security purposes, you can only request this after 42 seconds.')
    ).toBe('Por segurança, aguarde 42 segundos antes de tentar de novo.')
  })

  it('limite de envio de e-mails', () => {
    expect(translateAuthError('email rate limit exceeded')).toMatch(/Muitas tentativas/)
  })

  it('mensagem desconhecida passa como está; vazia vira genérica', () => {
    expect(translateAuthError('Something new')).toBe('Something new')
    expect(translateAuthError('')).toBe('Algo deu errado. Tente novamente.')
    expect(translateAuthError(undefined)).toBe('Algo deu errado. Tente novamente.')
  })
})
