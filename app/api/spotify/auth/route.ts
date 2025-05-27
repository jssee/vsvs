import { NextRequest, NextResponse } from 'next/server'

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
  
  // Manually construct the Spotify OAuth URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes.join(' '),
    redirect_uri: redirectUri,
    state: sessionId // Use sessionId as state for security
  })
  
  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`
  
  return NextResponse.redirect(authUrl)
}