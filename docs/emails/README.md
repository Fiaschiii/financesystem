# E-mails de segurança (Etapa 16)

O Supabase pode avisar por e-mail sempre que algo sensível muda na conta. Se não foi a própria pessoa que fez a mudança, o aviso é a chance de reagir: trocar a senha e revisar o app autenticador.

## Como ligar

Painel do Supabase → **Authentication → Emails** → aba **Security** (notificações de segurança). Para cada aviso abaixo:

1. Ligue a opção (**Enable**).
2. Cole o **Subject** e o corpo do arquivo correspondente.
3. Salve.

| Aviso no painel | Assunto | Arquivo |
|---|---|---|
| Password changed | Sua senha do Controle Financeiro foi alterada | [`senha-alterada.html`](senha-alterada.html) |
| Email address changed | O e-mail da sua conta foi alterado | [`email-alterado.html`](email-alterado.html) |
| MFA factor enrolled | Verificação em duas etapas ativada | [`mfa-ativada.html`](mfa-ativada.html) |
| MFA factor unenrolled | Verificação em duas etapas desativada | [`mfa-desativada.html`](mfa-desativada.html) |

Os textos usam só `{{ .Email }}`, que existe em todos os modelos do Supabase. Se o seu painel mostrar outras variáveis (como a data da mudança), elas podem ser acrescentadas.

No plano gratuito, o Supabase envia poucos e-mails por hora pelo servidor de e-mail dele. Para uso real, configure um SMTP próprio em **Authentication → Emails → SMTP Settings** (Resend, Brevo e parecidos têm plano gratuito).
