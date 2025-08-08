defmodule Vsvs.Competitions.Submission do
  use Ecto.Schema
  import Ecto.Changeset

  schema "submissions" do
    field :spotify_url, :string
    field :song_title, :string
    field :artist, :string
    field :spotify_track_id, :string
    field :submitted_at, :utc_datetime

    belongs_to :session, Vsvs.Competitions.Session
    belongs_to :user, Vsvs.Accounts.User
    has_many :votes, Vsvs.Competitions.Vote

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(submission, attrs) do
    submission
    |> cast(attrs, [:spotify_url, :song_title, :artist, :spotify_track_id, :session_id, :user_id])
    |> validate_required([:spotify_url, :session_id, :user_id])
    |> validate_spotify_url()
    |> put_change(:submitted_at, DateTime.utc_now(:second))
    |> unique_constraint([:session_id, :spotify_track_id], name: :submissions_session_id_spotify_track_id_index)
    |> foreign_key_constraint(:session_id)
    |> foreign_key_constraint(:user_id)
  end

  defp validate_spotify_url(changeset) do
    spotify_url = get_change(changeset, :spotify_url)
    
    if spotify_url do
      case extract_spotify_track_id(spotify_url) do
        {:ok, track_id} ->
          put_change(changeset, :spotify_track_id, track_id)
        {:error, _} ->
          add_error(changeset, :spotify_url, "must be a valid Spotify track URL")
      end
    else
      changeset
    end
  end

  defp extract_spotify_track_id(url) do
    # Extract Spotify track ID from various URL formats
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
end