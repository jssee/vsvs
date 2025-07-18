import { NextRequest, NextResponse } from 'next/server'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { createClient } from '$/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('spotify_access_token')?.value
    const spotifyUserId = cookieStore.get('spotify_user_id')?.value
    
    if (!accessToken || !spotifyUserId) {
      return NextResponse.json({ error: 'Not authenticated with Spotify' }, { status: 401 })
    }
    
    const { sessionId } = await request.json()
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }
    
    // Get submissions for this session
    const supabase = await createClient()
    const { data: submissions, error: submissionsError } = await supabase
      .from('submission')
      .select('track_id')
      .eq('session_id', sessionId)
      .not('track_id', 'is', null)
    
    if (submissionsError) {
      console.error('Submissions query error:', submissionsError)
      throw new Error(`Failed to fetch submissions: ${submissionsError.message}`)
    }
    
    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ error: 'No Spotify links found for this session' }, { status: 404 })
    }
    
    // Extract track IDs from Spotify URLs
    const trackUris = submissions
      .map(sub => extractSpotifyTrackId(sub.track_id))
      .filter(Boolean)
      .map(id => `spotify:track:${id}`)
    
    if (trackUris.length === 0) {
      return NextResponse.json({ error: 'No valid Spotify tracks found' }, { status: 400 })
    }
    
    // Create Spotify API instance using the SDK
    const spotifyApi = SpotifyApi.withAccessToken(process.env.SPOTIFY_CLIENT_ID!, {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: cookieStore.get('spotify_refresh_token')?.value || ''
    })
    
    // Get session details for playlist name
    const { data: session } = await supabase
      .from('session')
      .select('theme, gauntlet:gauntlet_id(name)')
      .eq('id', sessionId)
      .single()
    
    const playlistName = session 
      ? `${(session.gauntlet as any)?.name} - ${session.theme}`
      : `Session Playlist - ${new Date().toLocaleDateString()}`
    
    // Create playlist using direct API call first (simpler approach)
    const createPlaylistResponse = await fetch(`https://api.spotify.com/v1/users/${spotifyUserId}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: playlistName,
        description: 'Generated playlist from session submissions',
        public: false
      })
    })
    
    if (!createPlaylistResponse.ok) {
      throw new Error('Failed to create playlist')
    }
    
    const playlist = await createPlaylistResponse.json()
    
    // Add tracks to playlist
    const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: trackUris
      })
    })
    
    if (!addTracksResponse.ok) {
      throw new Error('Failed to add tracks to playlist')
    }
    
    return NextResponse.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        url: playlist.external_urls.spotify,
        trackCount: trackUris.length
      }
    })
    
  } catch (error) {
    console.error('Playlist creation error:', error)
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 })
  }
}

function extractSpotifyTrackId(url: string): string | null {
  if (!url) return null
  
  // Handle various Spotify URL formats
  const patterns = [
    /spotify:track:([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/,
    /spotify\.com\/track\/([a-zA-Z0-9]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  
  return null
}