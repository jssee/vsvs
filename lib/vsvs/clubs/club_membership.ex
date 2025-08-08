defmodule Vsvs.Clubs.ClubMembership do
  use Ecto.Schema
  import Ecto.Changeset

  schema "club_memberships" do
    belongs_to :club, Vsvs.Clubs.Club
    belongs_to :user, Vsvs.Accounts.User
    field :joined_at, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(membership, attrs) do
    membership
    |> cast(attrs, [:club_id, :user_id])
    |> validate_required([:club_id, :user_id])
    |> put_change(:joined_at, DateTime.utc_now(:second))
    |> unique_constraint([:club_id, :user_id], name: :club_memberships_club_id_user_id_index)
    |> foreign_key_constraint(:club_id)
    |> foreign_key_constraint(:user_id)
  end
end