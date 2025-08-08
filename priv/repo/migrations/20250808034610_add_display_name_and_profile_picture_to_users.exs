defmodule Vsvs.Repo.Migrations.AddDisplayNameAndProfilePictureToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :display_name, :string, null: false
      add :profile_picture_url, :string
    end
  end
end
