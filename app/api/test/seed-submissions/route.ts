import { NextResponse } from 'next/server'
import { createClient } from '$/utils/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // First, let's find any existing session
    const { data: sessions } = await supabase
      .from('session')
      .select('id, theme')
      .limit(1)
    
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: 'No sessions found. Create a session first.' }, { status: 404 })
    }
    
    const sessionId = sessions[0].id
    
    // Test Spotify track URLs
    const testTracks = [
      'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh', // Never Gonna Give You Up - Rick Astley
      'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp', // Mr. Brightside - The Killers  
      'https://open.spotify.com/track/1mea3bSkSGXuIRvnydlB5b'  // Bohemian Rhapsody - Queen
    ]
    
    // Delete any existing test submissions for this session
    await supabase
      .from('submission')
      .delete()
      .eq('session_id', sessionId)
    
    // Add test submissions
    const submissions = testTracks.map((track, index) => ({
      session_id: sessionId,
      user_id: null, // We'll use null for test data
      track_id: track
    }))
    
    const { data, error } = await supabase
      .from('submission')
      .insert(submissions)
      .select()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      message: `Added ${testTracks.length} test submissions to session ${sessionId}`,
      sessionId: sessionId,
      submissions: data
    })
    
  } catch (error) {
    console.error('Error seeding submissions:', error)
    return NextResponse.json({ error: 'Failed to seed test data' }, { status: 500 })
  }
}