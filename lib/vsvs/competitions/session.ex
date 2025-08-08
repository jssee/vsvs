defmodule Vsvs.Competitions.Session do
  use Ecto.Schema
  import Ecto.Changeset

  schema "sessions" do
    field :theme, :string
    field :session_number, :integer
    field :songs_per_user, :integer, default: 1
    field :voting_points_per_user, :integer, default: 10
    field :submission_deadline, :utc_datetime
    field :voting_deadline, :utc_datetime
    field :status, Ecto.Enum, values: [:setup, :submission, :voting, :completed], default: :setup
    field :playlist_generated, :boolean, default: false

    belongs_to :season, Vsvs.Competitions.Season
    has_many :submissions, Vsvs.Competitions.Submission
    has_many :votes, Vsvs.Competitions.Vote
    has_many :session_results, Vsvs.Competitions.SessionResult

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(session, attrs) do
    session
    |> cast(attrs, [
      :theme, :session_number, :songs_per_user, :voting_points_per_user,
      :submission_deadline, :voting_deadline, :status, :playlist_generated, :season_id
    ])
    |> validate_required([:theme, :session_number, :season_id])
    |> validate_length(:theme, min: 1, max: 200)
    |> validate_number(:session_number, greater_than: 0)
    |> validate_number(:songs_per_user, greater_than: 0, less_than_or_equal_to: 10)
    |> validate_number(:voting_points_per_user, greater_than: 0, less_than_or_equal_to: 100)
    |> validate_deadline_order()
    |> foreign_key_constraint(:season_id)
  end

  defp validate_deadline_order(changeset) do
    submission_deadline = get_field(changeset, :submission_deadline)
    voting_deadline = get_field(changeset, :voting_deadline)

    if submission_deadline && voting_deadline && 
       DateTime.compare(submission_deadline, voting_deadline) != :lt do
      add_error(changeset, :voting_deadline, "must be after submission deadline")
    else
      changeset
    end
  end
end