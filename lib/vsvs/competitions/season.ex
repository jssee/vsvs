defmodule Vsvs.Competitions.Season do
  use Ecto.Schema
  import Ecto.Changeset

  schema "seasons" do
    field :name, :string
    field :status, Ecto.Enum, values: [:active, :completed], default: :active
    field :started_at, :utc_datetime
    field :ended_at, :utc_datetime

    belongs_to :club, Vsvs.Clubs.Club
    has_many :sessions, Vsvs.Competitions.Session

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(season, attrs) do
    season
    |> cast(attrs, [:name, :status, :started_at, :ended_at, :club_id])
    |> validate_required([:name, :club_id])
    |> validate_length(:name, min: 1, max: 100)
    |> put_change(:started_at, DateTime.utc_now(:second))
    |> foreign_key_constraint(:club_id)
  end
end