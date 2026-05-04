import { WorkerMailer } from 'worker-mailer'
import PostalMime from 'postal-mime'

export default {
  async email(message, env) {
    const parsed = await PostalMime.parse(message.raw)

    const bodyText = parsed.text ?? ''
    const bodyHtml = parsed.html ?? ''

    const recipient = extractOriginalSender(bodyText)
                   ?? extractOriginalSender(stripHtml(bodyHtml))

    if (!recipient) {
      console.error('No original sender found in quoted body')
      message.setReject('Could not determine original recipient')
      return
    }

    const cleanText = rewriteAddress(bodyText, env.REWRITE_FROM, env.REWRITE_TO)
    const cleanHtml = rewriteAddress(bodyHtml, env.REWRITE_FROM, env.REWRITE_TO)

    await WorkerMailer.send(
      {
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT),
        credentials: {
          username: env.SMTP_USER,
          password: env.SMTP_PASS,
        },
        authType: env.SMTP_AUTH,
      },
      {
        from: { name: env.FROM_NAME, email: env.FROM_EMAIL },
        to: recipient,
        cc: env.CC_ADDRESSES ? env.CC_ADDRESSES.split(',').map(a => a.trim()).filter(Boolean) : undefined,
        subject: parsed.subject ?? '(no subject)',
        text: cleanText || undefined,
        html: cleanHtml || undefined,
      }
    )

    console.log(`Relayed to ${recipient} via ${env.SMTP_HOST}`)
  },
}

function extractOriginalSender(body) {
  if (!body) return null

  const patterns = [
    /\bvon\s+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}):/i,
    /\bfrom\s+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}):/i,
    /<([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})>\s*(wrote|schrieb)/i,
    /schrieb\s+.*?<([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})>/i,
    /^From:\s*(?:[^<\n]*<)?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})>?/im,
  ]

  for (const pattern of patterns) {
    const match = body.match(pattern)
    if (match?.[1]) return match[1].trim()
  }

  return null
}

function rewriteAddress(text, from, to) {
  if (!text || !from) return text
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escaped, 'gi'), to)
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
