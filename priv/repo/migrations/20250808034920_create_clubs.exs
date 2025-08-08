defmodule Vsvs.Repo.Migrations.CreateClubs do
  use Ecto.Migration

  def change do
    create table(:clubs) do
      add :name, :string, null: false
      add :description, :text, null: false
      add :member_limit, :integer
      add :creator_id, references(:users, on_delete: :restrict), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:clubs, [:creator_id])
    create index(:clubs, [:name])
  end
end
