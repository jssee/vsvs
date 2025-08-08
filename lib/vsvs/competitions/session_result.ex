defmodule Vsvs.Competitions.SessionResult do
  use Ecto.Schema
  import Ecto.Changeset

  schema "session_results" do
    field :total_points_received, :integer, default: 0
    field :calculated_at, :utc_datetime

    belongs_to :session, Vsvs.Competitions.Session
    belongs_to :user, Vsvs.Accounts.User

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(session_result, attrs) do
    session_result
    |> cast(attrs, [:total_points_received, :session_id, :user_id])
    |> validate_required([:session_id, :user_id])
    |> validate_number(:total_points_received, greater_than_or_equal_to: 0)
    |> put_change(:calculated_at, DateTime.utc_now(:second))
    |> unique_constraint([:session_id, :user_id], name: :session_results_session_id_user_id_index)
    |> foreign_key_constraint(:session_id)
    |> foreign_key_constraint(:user_id)
  end
end