defmodule Vsvs.Scoring do
  @moduledoc """
  The Scoring context for calculating competition results.
  """

  import Ecto.Query, warn: false
  alias Vsvs.Repo

  alias Vsvs.Competitions.{Session, Vote, Submission, SessionResult}

  @doc """
  Calculate and store session results for a completed session.
  """
  def calculate_session_results(session_id) do
    session = Vsvs.Competitions.get_session!(session_id)
    
    if session.status != :completed do
      {:error, :session_not_completed}
    else
      # Get all votes for this session grouped by submission
      vote_totals = get_vote_totals_by_submission(session_id)
      
      # Get all users who participated (submitted songs)
      participants = get_session_participants(session_id)
      
      # Calculate results for each participant
      results = Enum.map(participants, fn user_id ->
        total_points = calculate_user_total_points(user_id, vote_totals)
        
        %{
          session_id: session_id,
          user_id: user_id,
          total_points_received: total_points
        }
      end)
      
      # Store results in session_results table
      case store_session_results(results) do
        {:ok, _} -> {:ok, results}
        {:error, reason} -> {:error, reason}
      end
    end
  end

  @doc """
  Get leaderboard for a session (ranked by total points).
  """
  def get_session_leaderboard(session_id) do
    from(sr in SessionResult,
      join: u in Vsvs.Accounts.User, on: sr.user_id == u.id,
      where: sr.session_id == ^session_id,
      select: %{
        user_id: sr.user_id,
        display_name: u.display_name,
        total_points_received: sr.total_points_received,
        rank: row_number() |> over(order_by: [desc: sr.total_points_received])
      },
      order_by: [desc: sr.total_points_received]
    )
    |> Repo.all()
  end

  @doc """
  Get season leaderboard (aggregated across all sessions).
  """
  def get_season_leaderboard(season_id) do
    from(sr in SessionResult,
      join: s in Session, on: sr.session_id == s.id,
      join: u in Vsvs.Accounts.User, on: sr.user_id == u.id,
      where: s.season_id == ^season_id,
      group_by: [sr.user_id, u.display_name],
      select: %{
        user_id: sr.user_id,
        display_name: u.display_name,
        total_points_received: sum(sr.total_points_received),
        sessions_participated: count(sr.id)
      },
      order_by: [desc: sum(sr.total_points_received)]
    )
    |> Repo.all()
    |> add_season_ranks()
  end

  @doc """
  Get detailed voting breakdown for a session.
  """
  def get_session_voting_breakdown(session_id) do
    from(v in Vote,
      join: sub in Submission, on: v.submission_id == sub.id,
      join: voter in Vsvs.Accounts.User, on: v.voter_id == voter.id,
      join: submitter in Vsvs.Accounts.User, on: sub.user_id == submitter.id,
      where: v.session_id == ^session_id,
      select: %{
        voter_display_name: voter.display_name,
        submitter_display_name: submitter.display_name,
        song_title: sub.song_title,
        artist: sub.artist,
        points: v.points,
        voted_at: v.voted_at
      },
      order_by: [desc: v.points, asc: sub.song_title]
    )
    |> Repo.all()
  end

  @doc """
  Check if all votes are in for a session (all participants have allocated all their points).
  """
  def all_votes_complete?(session_id) do
    session = Vsvs.Competitions.get_session!(session_id)
    participants = get_session_participants(session_id)
    
    all_complete = Enum.all?(participants, fn user_id ->
      allocated_points = Vsvs.Competitions.calculate_user_points_allocated(session_id, user_id)
      allocated_points == session.voting_points_per_user
    end)
    
    all_complete
  end

  # Private functions

  defp get_vote_totals_by_submission(session_id) do
    from(v in Vote,
      where: v.session_id == ^session_id,
      group_by: v.submission_id,
      select: {v.submission_id, sum(v.points)}
    )
    |> Repo.all()
    |> Map.new()
  end

  defp get_session_participants(session_id) do
    from(s in Submission,
      where: s.session_id == ^session_id,
      distinct: s.user_id,
      select: s.user_id
    )
    |> Repo.all()
  end

  defp calculate_user_total_points(user_id, vote_totals) do
    # Get all submissions by this user
    user_submission_ids = from(s in Submission,
      where: s.user_id == ^user_id,
      select: s.id
    ) |> Repo.all()
    
    # Sum up points from vote_totals for this user's submissions
    user_submission_ids
    |> Enum.map(fn submission_id -> Map.get(vote_totals, submission_id, 0) end)
    |> Enum.sum()
  end

  defp store_session_results(results) do
    Repo.transaction(fn ->
      Enum.each(results, fn result_attrs ->
        %SessionResult{}
        |> SessionResult.changeset(result_attrs)
        |> Repo.insert!()
      end)
    end)
  end

  defp add_season_ranks(leaderboard) do
    leaderboard
    |> Enum.with_index(1)
    |> Enum.map(fn {entry, rank} -> Map.put(entry, :rank, rank) end)
  end
end