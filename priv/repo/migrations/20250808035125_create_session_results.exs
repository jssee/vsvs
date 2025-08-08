defmodule Vsvs.Repo.Migrations.CreateSessionResults do
  use Ecto.Migration

  def change do
    create table(:session_results) do
      add :total_points_received, :integer, default: 0
      add :calculated_at, :utc_datetime, null: false
      add :session_id, references(:sessions, on_delete: :delete_all), null: false
      add :user_id, references(:users, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:session_results, [:session_id])
    create index(:session_results, [:user_id])
    create unique_index(:session_results, [:session_id, :user_id])
  end
end
