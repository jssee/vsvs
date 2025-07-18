import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('spotify_access_token')?.value
    const spotifyUserId = cookieStore.get('spotify_user_id')?.value
    
    if (!accessToken || !spotifyUserId) {
      return NextResponse.json({ connected: false })
    }
    
    // Verify token is still valid by making a test API call
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (!response.ok) {
      return NextResponse.json({ connected: false })
    }
    
    const userProfile = await response.json()
    
    return NextResponse.json({ 
      connected: true, 
      userId: userProfile.id,
      displayName: userProfile.display_name
    })
    
  } catch (error) {
    console.error('Spotify status check error:', error)
    return NextResponse.json({ connected: false })
  }
}