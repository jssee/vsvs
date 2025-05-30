import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  console.log('Spotify auth route called')
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')
  
  console.log('Session ID:', sessionId)
  
  if (!sessionId) {
    console.log('No session ID provided')
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!
  const redirectUri = `${request.nextUrl.origin}/api/spotify/callback`
  
  const scopes = [
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private'
  ]
  
  // Generate cryptographically secure random state for CSRF protection
  const state = randomBytes(32).toString('hex')
  
  // Manually construct the Spotify OAuth URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes.join(' '),
    redirect_uri: redirectUri,
    state: state
  })
  
  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`
  
  // Store state->sessionId mapping in secure httpOnly cookie
  const response = NextResponse.redirect(authUrl)
  response.cookies.set('spotify_oauth_state', JSON.stringify({ state, sessionId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 // 10 minutes (OAuth flow should complete quickly)
  })
  
  return response
}