import { NextResponse } from 'next/server'
import { getAccessTokenFromCode } from '@/lib/music-api/spotify-auth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  console.log('Callback URL:', request.url)
  const code = searchParams.get('code')
  const encodedState = searchParams.get('state')
  console.log('Code:', code ? 'present' : 'missing')
  console.log('State:', encodedState)
  
  let next = '/'
  let verifier: string | undefined
  
  if (encodedState) {
    try {
      console.log('Decoding state...')
      const urlSafeBase64 = encodedState.replace(/-/g, '+').replace(/_/g, '/')
      const decoded = JSON.parse(atob(urlSafeBase64))
      console.log('Decoded state:', decoded)
      next = decoded.next || '/'
      verifier = decoded.verifier
    } catch (e) {
      console.error('Failed to decode state:', e)
      try {
        next = decodeURIComponent(encodedState)
      } catch (e2) {
        next = encodedState
      }
    }
  }

  console.log('Redirecting to:', `${origin}${next}`)

  // Ensure next starts with a slash if it's not a full URL
  if (next && !next.startsWith('http') && !next.startsWith('/')) {
    next = '/' + next
  }

  if (code) {
    try {
      const tokenData = await getAccessTokenFromCode(code, verifier)

      console.log('Token obtained, redirecting...')

      // Redirect to a client-side page that will store the token in localStorage
      // Pass both access_token and refresh_token
      const accessTokenHash = btoa(tokenData.accessToken).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const refreshTokenHash = btoa(tokenData.refreshToken).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const redirectUrl = `${origin}/callback/success?token=${accessTokenHash}&refresh=${refreshTokenHash}&next=${encodeURIComponent(next)}`
      
      return NextResponse.redirect(redirectUrl)
    } catch (error) {
      console.error('Error exchanging code for token:', error)
    }
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${next}`)
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`)
  } else {
    return NextResponse.redirect(`${origin}${next}`)
  }
}
