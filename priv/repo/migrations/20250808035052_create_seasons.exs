defmodule Vsvs.Repo.Migrations.CreateSeasons do
  use Ecto.Migration

  def change do
    create table(:seasons) do
      add :name, :string, null: false
      add :status, :string, null: false, default: "active"
      add :started_at, :utc_datetime
      add :ended_at, :utc_datetime
      add :club_id, references(:clubs, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:seasons, [:club_id])
    create index(:seasons, [:status])
  end
end
