defmodule Vsvs.Competitions do
  @moduledoc """
  The Competitions context.
  """

  import Ecto.Query, warn: false
  alias Vsvs.Repo

  alias Vsvs.Competitions.{Season, Session, Submission, Vote, SessionResult}

  ## Season CRUD

  @doc """
  Returns the list of seasons for a club.
  """
  def list_seasons(club_id) do
    from(s in Season,
      where: s.club_id == ^club_id,
      order_by: [desc: s.started_at]
    )
    |> Repo.all()
  end

  @doc """
  Gets a single season.
  """
  def get_season!(id), do: Repo.get!(Season, id)

  @doc """
  Creates a season.
  """
  def create_season(attrs \\ %{}) do
    %Season{}
    |> Season.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a season.
  """
  def update_season(%Season{} = season, attrs) do
    season
    |> Season.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking season changes.
  """
  def change_season(%Season{} = season, attrs \\ %{}) do
    Season.changeset(season, attrs)
  end

  ## Session CRUD

  @doc """
  Returns the list of sessions for a season.
  """
  def list_sessions(season_id) do
    from(s in Session,
      where: s.season_id == ^season_id,
      order_by: s.session_number
    )
    |> Repo.all()
  end

  @doc """
  Gets a single session.
  """
  def get_session!(id), do: Repo.get!(Session, id)

  @doc """
  Creates a session.
  """
  def create_session(attrs \\ %{}) do
    %Session{}
    |> Session.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a session.
  """
  def update_session(%Session{} = session, attrs) do
    session
    |> Session.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Starts a session by changing its status to :submission.
  """
  def start_session(%Session{} = session) do
    update_session(session, %{status: :submission})
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking session changes.
  """
  def change_session(%Session{} = session, attrs \\ %{}) do
    Session.changeset(session, attrs)
  end

  ## Submission CRUD

  @doc """
  Returns the list of submissions for a session.
  """
  def list_submissions(session_id) do
    from(s in Submission,
      where: s.session_id == ^session_id,
      preload: :user,
      order_by: s.submitted_at
    )
    |> Repo.all()
  end

  @doc """
  Gets a single submission.
  """
  def get_submission!(id), do: Repo.get!(Submission, id)

  @doc """
  Creates a submission.
  """
  def create_submission(attrs \\ %{}) do
    %Submission{}
    |> Submission.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a submission.
  """
  def update_submission(%Submission{} = submission, attrs) do
    submission
    |> Submission.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking submission changes.
  """
  def change_submission(%Submission{} = submission, attrs \\ %{}) do
    Submission.changeset(submission, attrs)
  end

  ## Vote CRUD

  @doc """
  Returns the list of votes for a session.
  """
  def list_votes(session_id) do
    from(v in Vote,
      where: v.session_id == ^session_id,
      preload: [:voter, :submission]
    )
    |> Repo.all()
  end

  @doc """
  Gets a single vote.
  """
  def get_vote!(id), do: Repo.get!(Vote, id)

  @doc """
  Creates a vote.
  """
  def create_vote(attrs \\ %{}) do
    %Vote{}
    |> Vote.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a vote.
  """
  def update_vote(%Vote{} = vote, attrs) do
    vote
    |> Vote.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking vote changes.
  """
  def change_vote(%Vote{} = vote, attrs \\ %{}) do
    Vote.changeset(vote, attrs)
  end

  @doc """
  Deletes a submission.
  """
  def delete_submission(%Submission{} = submission) do
    Repo.delete(submission)
  end

  @doc """
  Deletes a vote.
  """
  def delete_vote(%Vote{} = vote) do
    Repo.delete(vote)
  end

  ## Business Logic Functions

  @doc """
  Gets submissions for a user in a specific session.
  """
  def list_user_submissions(session_id, user_id) do
    from(s in Submission,
      where: s.session_id == ^session_id and s.user_id == ^user_id
    )
    |> Repo.all()
  end

  @doc """
  Gets votes by a user in a specific session.
  """
  def list_user_votes(session_id, user_id) do
    from(v in Vote,
      where: v.session_id == ^session_id and v.voter_id == ^user_id,
      preload: :submission
    )
    |> Repo.all()
  end

  @doc """
  Calculates total points allocated by a voter in a session.
  """
  def calculate_user_points_allocated(session_id, user_id) do
    from(v in Vote,
      where: v.session_id == ^session_id and v.voter_id == ^user_id,
      select: sum(v.points)
    )
    |> Repo.one() || 0
  end

  @doc """
  Checks if a user can vote in a session (has submitted songs and hasn't used all points).
  """
  def can_vote?(session_id, user_id) do
    # User must have submitted songs to vote
    submission_count = from(s in Submission,
      where: s.session_id == ^session_id and s.user_id == ^user_id,
      select: count()
    ) |> Repo.one()

    submission_count > 0
  end
end