import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
const TO_EMAIL   = Deno.env.get('CONTACT_TO_EMAIL') ?? 'info@bontontse.hu'
const FROM_EMAIL = Deno.env.get('CONTACT_FROM_EMAIL') ?? 'noreply@bontontse.hu'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { name, email, interest, message } = await req.json()

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Hiányzó mezők' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Bonton Kapcsolat <${FROM_EMAIL}>`,
        to: [TO_EMAIL],
        reply_to: email,
        subject: `Új üzenet: ${interest ?? 'Általános'} – ${name}`,
        html: `
          <h2 style="font-family:sans-serif">Új kapcsolatfelvétel</h2>
          <table style="font-family:sans-serif;font-size:15px;line-height:1.7">
            <tr><td style="padding:4px 16px 4px 0;color:#888">Név</td><td><strong>${name}</strong></td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#888">E-mail</td><td><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#888">Érdeklődés</td><td>${interest ?? '–'}</td></tr>
          </table>
          <hr style="margin:16px 0;border:none;border-top:1px solid #eee">
          <p style="font-family:sans-serif;font-size:15px;line-height:1.7;white-space:pre-wrap">${message}</p>
        `,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message ?? 'Resend hiba')
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }
})
