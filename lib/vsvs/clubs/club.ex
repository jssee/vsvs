defmodule Vsvs.Clubs.Club do
  use Ecto.Schema
  import Ecto.Changeset

  schema "clubs" do
    field :name, :string
    field :description, :string
    field :member_limit, :integer
    
    belongs_to :creator, Vsvs.Accounts.User, foreign_key: :creator_id
    
    has_many :memberships, Vsvs.Clubs.ClubMembership
    has_many :members, through: [:memberships, :user]
    has_many :seasons, Vsvs.Competitions.Season

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(club, attrs) do
    club
    |> cast(attrs, [:name, :description, :member_limit, :creator_id])
    |> validate_required([:name, :description, :creator_id])
    |> validate_length(:name, min: 1, max: 100)
    |> validate_length(:description, min: 1, max: 500)
    |> validate_number(:member_limit, greater_than: 0, less_than: 1000)
    |> foreign_key_constraint(:creator_id)
  end
end