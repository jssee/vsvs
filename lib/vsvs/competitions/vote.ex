defmodule Vsvs.Competitions.Vote do
  use Ecto.Schema
  import Ecto.Changeset

  schema "votes" do
    field :points, :integer
    field :voted_at, :utc_datetime

    belongs_to :session, Vsvs.Competitions.Session
    belongs_to :voter, Vsvs.Accounts.User
    belongs_to :submission, Vsvs.Competitions.Submission

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(vote, attrs) do
    vote
    |> cast(attrs, [:points, :session_id, :voter_id, :submission_id])
    |> validate_required([:points, :session_id, :voter_id, :submission_id])
    |> validate_number(:points, greater_than: 0)
    |> put_change(:voted_at, DateTime.utc_now(:second))
    |> unique_constraint([:voter_id, :submission_id], name: :votes_voter_id_submission_id_index)
    |> foreign_key_constraint(:session_id)
    |> foreign_key_constraint(:voter_id)
    |> foreign_key_constraint(:submission_id)
    |> validate_not_voting_for_own_submission()
  end

  defp validate_not_voting_for_own_submission(changeset) do
    voter_id = get_field(changeset, :voter_id)
    submission_id = get_field(changeset, :submission_id)

    if voter_id && submission_id do
      submission = Vsvs.Repo.get(Vsvs.Competitions.Submission, submission_id)
      
      if submission && submission.user_id == voter_id do
        add_error(changeset, :submission_id, "cannot vote for your own submission")
      else
        changeset
      end
    else
      changeset
    end
  end
end