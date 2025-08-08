defmodule Vsvs.Repo.Migrations.CreateSubmissions do
  use Ecto.Migration

  def change do
    create table(:submissions) do
      add :spotify_url, :string, null: false
      add :song_title, :string
      add :artist, :string
      add :spotify_track_id, :string
      add :submitted_at, :utc_datetime, null: false
      add :session_id, references(:sessions, on_delete: :delete_all), null: false
      add :user_id, references(:users, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:submissions, [:session_id])
    create index(:submissions, [:user_id])
    create unique_index(:submissions, [:session_id, :spotify_track_id])
  end
end
