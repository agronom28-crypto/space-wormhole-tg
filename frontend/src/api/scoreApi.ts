import { TG_CONTEXT } from '../main'

const HMAC_SECRET = import.meta.env.VITE_HMAC_SECRET || ''

/** Client-side HMAC using SubtleCrypto (same algorithm as backend) */
async function signScore(uid: number, score: number, level: number): Promise<string> {
  const payload = `${uid}|${score}|${level}`
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function submitScore(params: {
  score: number
  level_reached: number
  session_seconds: number
}) {
  const { uid, uname, imid, cid, mid } = TG_CONTEXT
  if (!uid) return  // dev mode without Telegram context

  const hmac = await signScore(uid, params.score, params.level_reached)

  try {
    await fetch('/api/score/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tg_user_id: uid,
        tg_username: uname,
        score: params.score,
        level_reached: params.level_reached,
        session_seconds: params.session_seconds,
        inline_message_id: imid,
        chat_id: cid || null,
        message_id: mid || null,
        hmac,
      }),
    })
  } catch (e) {
    console.warn('Score submit failed:', e)
  }
}
