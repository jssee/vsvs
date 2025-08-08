defmodule Vsvs.Workers.SpotifyMetadataWorker do
  use Oban.Worker, queue: :spotify, max_attempts: 3

  alias Vsvs.{Competitions, Spotify}

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"submission_id" => submission_id}}) do
    submission = Competitions.get_submission!(submission_id)
    
    case Spotify.extract_track_id(submission.spotify_url) do
      {:ok, track_id} ->
        case Spotify.get_track_metadata(track_id) do
          {:ok, %{song_title: title, artist: artist}} ->
            attrs = %{
              song_title: title,
              artist: artist,
              spotify_track_id: track_id
            }
            
            case Competitions.update_submission(submission, attrs) do
              {:ok, _updated_submission} -> :ok
              {:error, changeset} -> 
                {:error, "Failed to update submission: #{inspect(changeset.errors)}"}
            end
          
          {:error, reason} ->
            {:error, "Failed to fetch track metadata: #{reason}"}
        end
      
      {:error, reason} ->
        {:error, "Invalid Spotify URL: #{reason}"}
    end
  end
end