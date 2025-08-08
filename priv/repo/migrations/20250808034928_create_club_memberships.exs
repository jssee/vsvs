defmodule Vsvs.Repo.Migrations.CreateClubMemberships do
  use Ecto.Migration

  def change do
    create table(:club_memberships) do
      add :club_id, references(:clubs, on_delete: :delete_all), null: false
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :joined_at, :utc_datetime, null: false

      timestamps(type: :utc_datetime)
    end

    create index(:club_memberships, [:club_id])
    create index(:club_memberships, [:user_id])
    create unique_index(:club_memberships, [:club_id, :user_id])
  end
end
