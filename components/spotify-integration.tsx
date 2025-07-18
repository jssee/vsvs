'use client'

import { useState, useEffect } from 'react'

interface SpotifyIntegrationProps {
  sessionId: string
}

export function SpotifyIntegration({ sessionId }: SpotifyIntegrationProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [spotifyUserId, setSpotifyUserId] = useState<string | null>(null)
  const [testSessionId, setTestSessionId] = useState(sessionId)
  const [playlist, setPlaylist] = useState<{
    id: string
    name: string
    url: string
    trackCount: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check connection status on component mount
  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/spotify/status')
      const data = await response.json()
      setIsConnected(data.connected)
      if (data.connected) {
        setSpotifyUserId(data.userId)
      }
    } catch (err) {
      console.error('Failed to check Spotify connection:', err)
    }
  }

  const handleConnectSpotify = () => {
    console.log('Connecting to Spotify with sessionId:', sessionId)
    const url = `/api/spotify/auth?sessionId=${sessionId}`
    console.log('Redirecting to:', url)
    window.location.href = url
  }

  const handleSeedTestData = async () => {
    try {
      setError(null)
      const response = await fetch('/api/test/seed-submissions', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to seed test data')
      }
      
      setTestSessionId(data.sessionId.toString())
      alert(`✅ Added ${data.submissions.length} test Spotify tracks to session ${data.sessionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed test data')
    }
  }

  const handleCreatePlaylist = async () => {
    setIsCreating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/spotify/playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: testSessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create playlist')
      }

      setPlaylist(data.playlist)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsCreating(false)
    }
  }

  if (playlist) {
    return (
      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold text-green-600">✅ Playlist Created!</h3>
        <div className="space-y-2">
          <p><strong>Name:</strong> {playlist.name}</p>
          <p><strong>Tracks:</strong> {playlist.trackCount}</p>
          <a 
            href={playlist.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Open in Spotify
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Spotify Integration</h3>
      
      {/* Connection Status */}
      <div className={`p-3 rounded ${isConnected ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-gray-100 border border-gray-400 text-gray-700'}`}>
        {isConnected ? (
          <div>
            <p>✅ Connected to Spotify</p>
            {spotifyUserId && <p className="text-sm">User ID: {spotifyUserId}</p>}
          </div>
        ) : (
          <p>❌ Not connected to Spotify</p>
        )}
      </div>
      
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        {!isConnected && (
          <button 
            onClick={handleConnectSpotify}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Connect Spotify Account
          </button>
        )}
        
        <div className="flex gap-2">
          <button 
            onClick={handleSeedTestData}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Add Test Spotify Tracks
          </button>
          
          <button 
            onClick={handleCreatePlaylist} 
            disabled={isCreating || !isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isCreating ? 'Creating Playlist...' : 'Create Playlist from Session'}
          </button>
        </div>
      </div>
      
      <div className="text-sm text-gray-600">
        <p>Current session ID: {testSessionId}</p>
      </div>
      
      <p className="text-sm text-gray-600">
        {isConnected 
          ? 'You can now create playlists from session submissions.'
          : 'Connect your Spotify account to create playlists from session submissions.'
        }
      </p>
    </div>
  )
}