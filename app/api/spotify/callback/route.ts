import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  if (error) {
    return NextResponse.redirect(`${request.nextUrl.origin}/protected?error=spotify_auth_failed`)
  }
  
  if (!code || !state) {
    return NextResponse.redirect(`${request.nextUrl.origin}/protected?error=missing_params`)
  }
  
  // Validate state parameter and retrieve sessionId from secure cookie
  const oauthStateCookie = request.cookies.get('spotify_oauth_state')
  if (!oauthStateCookie) {
    return NextResponse.redirect(`${request.nextUrl.origin}/protected?error=missing_oauth_state`)
  }
  
  let storedData
  try {
    storedData = JSON.parse(oauthStateCookie.value)
  } catch {
    return NextResponse.redirect(`${request.nextUrl.origin}/protected?error=invalid_oauth_state`)
  }
  
  if (storedData.state !== state) {
    return NextResponse.redirect(`${request.nextUrl.origin}/protected?error=invalid_state`)
  }
  
  const sessionId = storedData.sessionId
  
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID!
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!
    const redirectUri = `${request.nextUrl.origin}/api/spotify/callback`
    
    // Exchange code for access token using standard OAuth flow
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    })
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token')
    }
    
    const tokens = await tokenResponse.json()
    
    // Get user info
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    })
    
    if (!userResponse.ok) {
      throw new Error('Failed to get user profile')
    }
    
    const userProfile = await userResponse.json()
    
    // Store tokens in secure httpOnly cookies
    const response = NextResponse.redirect(`${request.nextUrl.origin}/protected`)
    
    response.cookies.set('spotify_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600
    })
    
    if (tokens.refresh_token) {
      response.cookies.set('spotify_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })
    }
    
    response.cookies.set('spotify_user_id', userProfile.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })
    
    // Clear the OAuth state cookie after successful authentication
    response.cookies.delete('spotify_oauth_state')
    
    return response
    
  } catch (error) {
    console.error('Spotify callback error:', error)
    return NextResponse.redirect(`${request.nextUrl.origin}/protected?error=spotify_callback_failed`)
  }
}