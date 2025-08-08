defmodule Vsvs.Repo.Migrations.CreateSessions do
  use Ecto.Migration

  def change do
    create table(:sessions) do
      add :theme, :string, null: false
      add :session_number, :integer, null: false
      add :songs_per_user, :integer, default: 1
      add :voting_points_per_user, :integer, default: 10
      add :submission_deadline, :utc_datetime
      add :voting_deadline, :utc_datetime
      add :status, :string, null: false, default: "setup"
      add :playlist_generated, :boolean, default: false
      add :season_id, references(:seasons, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:sessions, [:season_id])
    create index(:sessions, [:status])
    create unique_index(:sessions, [:season_id, :session_number])
  end
end
