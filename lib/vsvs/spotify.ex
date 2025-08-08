defmodule Vsvs.Spotify do
  @moduledoc """
  The Spotify context for API integration.
  """

  require Logger

  @base_url "https://api.spotify.com/v1"
  @auth_url "https://accounts.spotify.com/api/token"

  @doc """
  Get an access token using client credentials flow.
  """
  def get_access_token() do
    client_id = Application.get_env(:vsvs, :spotify_client_id)
    client_secret = Application.get_env(:vsvs, :spotify_client_secret)

    if !client_id || !client_secret do
      Logger.error("Spotify credentials not configured")
      {:error, :missing_credentials}
    else
      auth_string = Base.encode64("#{client_id}:#{client_secret}")

      headers = [
        {"Authorization", "Basic #{auth_string}"},
        {"Content-Type", "application/x-www-form-urlencoded"}
      ]

      body = "grant_type=client_credentials"

      case Req.post(@auth_url, body: body, headers: headers) do
        {:ok, %{status: 200, body: %{"access_token" => token}}} ->
          {:ok, token}
        
        {:ok, %{status: status, body: body}} ->
          Logger.error("Spotify auth failed: #{status} #{inspect(body)}")
          {:error, :auth_failed}
        
        {:error, reason} ->
          Logger.error("Spotify auth request failed: #{inspect(reason)}")
          {:error, :request_failed}
      end
    end
  end

  @doc """
  Extract track metadata from Spotify track ID.
  """
  def get_track_metadata(track_id) when is_binary(track_id) do
    with {:ok, token} <- get_access_token(),
         {:ok, track_data} <- fetch_track(track_id, token) do
      {:ok, parse_track_data(track_data)}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Extract Spotify track ID from various URL formats.
  """
  def extract_track_id(url) when is_binary(url) do
    cond do
      String.contains?(url, "open.spotify.com/track/") ->
        case Regex.run(~r|spotify\.com/track/([a-zA-Z0-9]+)|, url) do
          [_, track_id] -> {:ok, track_id}
          _ -> {:error, :invalid_format}
        end
      
      String.contains?(url, "spotify:track:") ->
        case Regex.run(~r|spotify:track:([a-zA-Z0-9]+)|, url) do
          [_, track_id] -> {:ok, track_id}
          _ -> {:error, :invalid_format}
        end
      
      true ->
        {:error, :invalid_format}
    end
  end

  @doc """
  Create a Spotify playlist.
  """
  def create_playlist(name, description) do
    with {:ok, token} <- get_access_token() do
      # This would require user auth, but for MVP we'll just stub it
      # In a full implementation, you'd need Spotify user OAuth
      {:ok, %{id: "playlist_id_placeholder", external_urls: %{spotify: "https://spotify.com/playlist/placeholder"}}}
    end
  end

  @doc """
  Add tracks to a Spotify playlist.
  """
  def add_tracks_to_playlist(playlist_id, track_uris) when is_list(track_uris) do
    with {:ok, token} <- get_access_token() do
      # This would require user auth, but for MVP we'll just stub it
      Logger.info("Would add #{length(track_uris)} tracks to playlist #{playlist_id}")
      {:ok, :added}
    end
  end

  # Private functions

  defp fetch_track(track_id, token) do
    url = "#{@base_url}/tracks/#{track_id}"
    headers = [{"Authorization", "Bearer #{token}"}]

    case Req.get(url, headers: headers) do
      {:ok, %{status: 200, body: track_data}} ->
        {:ok, track_data}
      
      {:ok, %{status: 404}} ->
        {:error, :track_not_found}
      
      {:ok, %{status: status, body: body}} ->
        Logger.error("Spotify API error: #{status} #{inspect(body)}")
        {:error, :api_error}
      
      {:error, reason} ->
        Logger.error("Spotify API request failed: #{inspect(reason)}")
        {:error, :request_failed}
    end
  end

  defp parse_track_data(%{"name" => name, "artists" => artists}) do
    artist_names = Enum.map(artists, & &1["name"]) |> Enum.join(", ")
    
    %{
      song_title: name,
      artist: artist_names
    }
  end

  defp parse_track_data(_), do: %{song_title: nil, artist: nil}
end