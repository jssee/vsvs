defmodule Vsvs.Workers.SessionTransitionWorker do
  use Oban.Worker, queue: :scheduled, max_attempts: 3

  alias Vsvs.{Competitions, Scoring}

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"session_id" => session_id, "transition" => transition}}) do
    session = Competitions.get_session!(session_id)
    
    case transition do
      "submission_to_voting" ->
        handle_submission_to_voting(session)
      
      "voting_to_completed" ->
        handle_voting_to_completed(session)
      
      _ ->
        {:error, "Unknown transition: #{transition}"}
    end
  end

  defp handle_submission_to_voting(session) do
    if DateTime.compare(DateTime.utc_now(), session.submission_deadline) != :lt do
      case Competitions.update_session(session, %{status: :voting}) do
        {:ok, _updated_session} ->
          # Broadcast status change to LiveViews
          Phoenix.PubSub.broadcast(
            Vsvs.PubSub,
            "session:#{session.id}",
            {:session_status_changed, :voting}
          )
          :ok
        
        {:error, changeset} ->
          {:error, "Failed to transition session: #{inspect(changeset.errors)}"}
      end
    else
      # Not yet time to transition
      :ok
    end
  end

  defp handle_voting_to_completed(session) do
    if DateTime.compare(DateTime.utc_now(), session.voting_deadline) != :lt do
      # Update session status to completed
      case Competitions.update_session(session, %{status: :completed}) do
        {:ok, updated_session} ->
          # Calculate session results
          case Scoring.calculate_session_results(session.id) do
            {:ok, _results} ->
              # Broadcast completion
              Phoenix.PubSub.broadcast(
                Vsvs.PubSub,
                "session:#{session.id}",
                {:session_completed, updated_session}
              )
              :ok
            
            {:error, reason} ->
              {:error, "Failed to calculate results: #{reason}"}
          end
        
        {:error, changeset} ->
          {:error, "Failed to complete session: #{inspect(changeset.errors)}"}
      end
    else
      # Not yet time to transition
      :ok
    end
  end
end