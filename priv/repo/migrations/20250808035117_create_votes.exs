defmodule Vsvs.Repo.Migrations.CreateVotes do
  use Ecto.Migration

  def change do
    create table(:votes) do
      add :points, :integer, null: false
      add :voted_at, :utc_datetime, null: false
      add :session_id, references(:sessions, on_delete: :delete_all), null: false
      add :voter_id, references(:users, on_delete: :delete_all), null: false
      add :submission_id, references(:submissions, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:votes, [:session_id])
    create index(:votes, [:voter_id])
    create index(:votes, [:submission_id])
    create unique_index(:votes, [:voter_id, :submission_id])
  end
end
