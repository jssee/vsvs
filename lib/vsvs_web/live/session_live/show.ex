defmodule VsvsWeb.SessionLive.Show do
  use VsvsWeb, :live_view

  alias Vsvs.{Competitions, Scoring, Clubs, Repo}
  alias Vsvs.Competitions.{Submission, Vote}

  @impl true
  def mount(%{"id" => session_id}, _session, socket) do
    if connected?(socket) do
      Phoenix.PubSub.subscribe(Vsvs.PubSub, "session:#{session_id}")
    end
    
    session = Competitions.get_session!(session_id)
    user_id = socket.assigns.current_scope.user.id
    
    # Load session with preloaded season and club
    session = Repo.preload(session, season: :club)
    
    # Check if user is a club member
    unless Clubs.member?(session.season.club.id, user_id) do
      {:ok,
       socket
       |> put_flash(:error, "You don't have access to this session")
       |> push_navigate(to: ~p"/dashboard")}
    else
      {:ok, load_session_data(socket, session, user_id)}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="mx-auto max-w-4xl px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <nav class="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <.link navigate={~p"/dashboard"} class="hover:text-gray-700">Dashboard</.link>
              <span>→</span>
              <.link navigate={~p"/clubs/#{@session.season.club.id}"} class="hover:text-gray-700">
                <%= @session.season.club.name %>
              </.link>
              <span>→</span>
              <span class="text-gray-900">Session <%= @session.session_number %></span>
            </nav>
            
            <h1 class="text-2xl font-semibold text-gray-900">
              <%= @session.theme %>
            </h1>
            <div class="mt-2 flex items-center space-x-4 text-sm text-gray-500">
              <span>Status: <%= humanize_status(@session.status) %></span>
              <%= if @session.submission_deadline do %>
                <span>•</span>
                <span>Submissions due <%= format_deadline(@session.submission_deadline) %></span>
              <% end %>
              <%= if @session.voting_deadline do %>
                <span>•</span>
                <span>Voting ends <%= format_deadline(@session.voting_deadline) %></span>
              <% end %>
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <%= case @session.status do %>
              <% :submission -> %>
                <span class="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                  Submission Phase
                </span>
              <% :voting -> %>
                <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Voting Phase
                </span>
              <% :completed -> %>
                <span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  Completed
                </span>
              <% _ -> %>
                <span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                  <%= humanize_status(@session.status) %>
                </span>
            <% end %>
          </div>
        </div>
      </div>

      <!-- Main Content based on phase -->
      <%= case @session.status do %>
        <% :submission -> %>
          <%= render_submission_phase(assigns) %>
        <% :voting -> %>
          <%= render_voting_phase(assigns) %>
        <% :completed -> %>
          <%= render_results_phase(assigns) %>
        <% _ -> %>
          <div class="text-center py-12 bg-white shadow sm:rounded-lg">
            <p class="text-gray-500">This session is not yet active.</p>
          </div>
      <% end %>
    </div>
    """
  end

  # Submission Phase Template
  defp render_submission_phase(assigns) do
    ~H"""
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Submission Form -->
      <div class="lg:col-span-2">
        <div class="bg-white shadow sm:rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">
              Submit Your Songs
            </h3>
            <p class="text-sm text-gray-600 mb-6">
              Submit up to <%= @session.songs_per_user %> song(s) for the theme "<%= @session.theme %>".
              Use Spotify URLs (like https://open.spotify.com/track/... or spotify:track:...).
            </p>
            
            <%= if length(@user_submissions) < @session.songs_per_user do %>
              <.form for={@submission_form} id="submission_form" phx-submit="submit_song" class="mb-6">
                <div class="flex space-x-3">
                  <div class="flex-1">
                    <.input
                      field={@submission_form[:spotify_url]}
                      type="url"
                      placeholder="Paste Spotify URL here..."
                      phx-mounted={JS.focus()}
                    />
                  </div>
                  <.button 
                    type="submit"
                    phx-disable-with="Submitting..."
                    class="flex-shrink-0"
                  >
                    Submit Song
                  </.button>
                </div>
              </.form>
            <% else %>
              <div class="rounded-md bg-green-50 p-4 mb-6">
                <div class="flex">
                  <div class="ml-3">
                    <p class="text-sm text-green-800">
                      You've submitted all <%= @session.songs_per_user %> song(s) for this session! 
                      Wait for the voting phase to begin.
                    </p>
                  </div>
                </div>
              </div>
            <% end %>

            <!-- User's Submissions -->
            <%= if @user_submissions != [] do %>
              <div>
                <h4 class="text-sm font-medium text-gray-900 mb-3">Your Submissions</h4>
                <div class="space-y-3">
                  <%= for submission <- @user_submissions do %>
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div class="flex-1">
                        <%= if submission.song_title do %>
                          <p class="text-sm font-medium text-gray-900">
                            <%= submission.song_title %>
                          </p>
                          <p class="text-sm text-gray-500">
                            by <%= submission.artist %>
                          </p>
                        <% else %>
                          <p class="text-sm text-gray-500">
                            Processing metadata...
                          </p>
                          <p class="text-xs text-gray-400">
                            <%= submission.spotify_url %>
                          </p>
                        <% end %>
                      </div>
                      <.button
                        phx-click="remove_submission"
                        phx-value-id={submission.id}
                        phx-confirm="Are you sure you want to remove this submission?"
                        class="text-sm border border-red-300 bg-white text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </.button>
                    </div>
                  <% end %>
                </div>
              </div>
            <% end %>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div>
        <div class="bg-white shadow sm:rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Participation</h3>
            <dl class="space-y-3">
              <div class="flex justify-between">
                <dt class="text-sm text-gray-500">Total submissions</dt>
                <dd class="text-sm font-medium text-gray-900"><%= length(@all_submissions) %></dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-sm text-gray-500">Your submissions</dt>
                <dd class="text-sm font-medium text-gray-900">
                  <%= length(@user_submissions) %> / <%= @session.songs_per_user %>
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-sm text-gray-500">Time remaining</dt>
                <dd class="text-sm font-medium text-gray-900">
                  <%= if @session.submission_deadline do %>
                    <%= format_deadline(@session.submission_deadline) %>
                  <% else %>
                    No deadline
                  <% end %>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
    """
  end

  # Voting Phase Template  
  defp render_voting_phase(assigns) do
    ~H"""
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Voting Interface -->
      <div class="lg:col-span-2">
        <%= if @can_vote do %>
          <div class="bg-white shadow sm:rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">
                Vote for Your Favorites
              </h3>
              <p class="text-sm text-gray-600 mb-6">
                You have <%= @session.voting_points_per_user %> points to distribute among the submissions.
                Points remaining: <span class="font-medium"><%= @points_remaining %></span>
              </p>

              <div class="space-y-4">
                <%= for submission <- @all_submissions do %>
                  <%= unless submission.user_id == @user_id do %>
                    <div class="border border-gray-200 rounded-lg p-4">
                      <div class="flex items-center justify-between">
                        <div class="flex-1">
                          <%= if submission.song_title do %>
                            <h4 class="text-sm font-medium text-gray-900">
                              <%= submission.song_title %>
                            </h4>
                            <p class="text-sm text-gray-500">
                              by <%= submission.artist %>
                            </p>
                          <% else %>
                            <p class="text-sm text-gray-500">
                              Processing metadata...
                            </p>
                          <% end %>
                        </div>
                        
                        <div class="flex items-center space-x-2">
                          <%= for points <- 1..5 do %>
                            <.button
                              phx-click="vote"
                              phx-value-submission-id={submission.id}
                              phx-value-points={points}
                              class={[
                                "text-sm px-3 py-1",
                                if get_user_vote_points(submission.id, @user_votes) == points do
                                  "bg-indigo-600 text-white"
                                else
                                  "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                end
                              ]}
                            >
                              <%= points %>
                            </.button>
                          <% end %>
                          
                          <%= if get_user_vote_points(submission.id, @user_votes) > 0 do %>
                            <.button
                              phx-click="remove_vote"
                              phx-value-submission-id={submission.id}
                              class="text-sm border border-red-300 bg-white text-red-600 hover:bg-red-50"
                            >
                              Clear
                            </.button>
                          <% end %>
                        </div>
                      </div>
                      
                      <%= if get_user_vote_points(submission.id, @user_votes) > 0 do %>
                        <div class="mt-2 text-xs text-indigo-600">
                          You gave this <%= get_user_vote_points(submission.id, @user_votes) %> points
                        </div>
                      <% end %>
                    </div>
                  <% end %>
                <% end %>
              </div>

              <%= if @points_remaining == 0 do %>
                <div class="mt-6 rounded-md bg-green-50 p-4">
                  <p class="text-sm text-green-800">
                    ✓ You've allocated all your points! Your votes are saved automatically.
                  </p>
                </div>
              <% end %>
            </div>
          </div>
        <% else %>
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 class="text-sm font-medium text-yellow-800">Can't Vote Yet</h3>
            <p class="mt-1 text-sm text-yellow-700">
              You need to submit at least one song to participate in voting.
            </p>
          </div>
        <% end %>
      </div>

      <!-- Sidebar -->
      <div>
        <div class="bg-white shadow sm:rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Voting Status</h3>
            <dl class="space-y-3">
              <div class="flex justify-between">
                <dt class="text-sm text-gray-500">Your points</dt>
                <dd class="text-sm font-medium text-gray-900">
                  <%= @session.voting_points_per_user - @points_remaining %> / <%= @session.voting_points_per_user %>
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-sm text-gray-500">Songs to vote on</dt>
                <dd class="text-sm font-medium text-gray-900">
                  <%= Enum.count(@all_submissions, &(&1.user_id != @user_id)) %>
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-sm text-gray-500">Time remaining</dt>
                <dd class="text-sm font-medium text-gray-900">
                  <%= if @session.voting_deadline do %>
                    <%= format_deadline(@session.voting_deadline) %>
                  <% else %>
                    No deadline
                  <% end %>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
    """
  end

  # Results Phase Template
  defp render_results_phase(assigns) do
    ~H"""
    <div class="space-y-8">
      <%= if @session_results != [] do %>
        <!-- Leaderboard -->
        <div class="bg-white shadow sm:rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-6">Session Results</h3>
            
            <div class="space-y-4">
              <%= for {result, index} <- Enum.with_index(@session_results, 1) do %>
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div class="flex items-center space-x-4">
                    <div class="flex-shrink-0">
                      <span class={[
                        "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                        case index do
                          1 -> "bg-yellow-100 text-yellow-800"
                          2 -> "bg-gray-100 text-gray-800"  
                          3 -> "bg-orange-100 text-orange-800"
                          _ -> "bg-gray-50 text-gray-600"
                        end
                      ]}>
                        <%= index %>
                      </span>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900">
                        <%= result.display_name %>
                        <%= if result.user_id == @user_id do %>
                          <span class="text-indigo-600">(You)</span>
                        <% end %>
                      </p>
                    </div>
                  </div>
                  <div class="text-sm font-medium text-gray-900">
                    <%= result.total_points_received %> points
                  </div>
                </div>
              <% end %>
            </div>
          </div>
        </div>

        <!-- Voting Breakdown -->
        <%= if @voting_breakdown != [] do %>
          <div class="bg-white shadow sm:rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg font-medium text-gray-900 mb-6">Voting Breakdown</h3>
              
              <div class="space-y-6">
                <%= for {song_title, votes} <- @grouped_votes do %>
                  <div class="border-l-4 border-indigo-200 pl-4">
                    <h4 class="text-sm font-medium text-gray-900 mb-2"><%= song_title %></h4>
                    <div class="space-y-1">
                      <%= for vote <- votes do %>
                        <div class="flex justify-between text-xs text-gray-600">
                          <span><%= vote.voter_display_name %></span>
                          <span><%= vote.points %> points</span>
                        </div>
                      <% end %>
                    </div>
                  </div>
                <% end %>
              </div>
            </div>
          </div>
        <% end %>
      <% else %>
        <div class="text-center py-12 bg-white shadow sm:rounded-lg">
          <p class="text-gray-500">Results are being calculated...</p>
        </div>
      <% end %>
    </div>
    """
  end

  @impl true
  def handle_event("submit_song", %{"submission" => %{"spotify_url" => url}}, socket) do
    if String.trim(url) == "" do
      {:noreply, put_flash(socket, :error, "Please enter a Spotify URL")}
    else
      attrs = %{
        spotify_url: String.trim(url),
        session_id: socket.assigns.session.id,
        user_id: socket.assigns.user_id
      }
      
      case Competitions.create_submission(attrs) do
        {:ok, submission} ->
          # Queue background job to fetch metadata
          %{submission_id: submission.id}
          |> Vsvs.Workers.SpotifyMetadataWorker.new()
          |> Oban.insert()
          
          socket = 
            socket
            |> put_flash(:info, "Song submitted successfully!")
            |> load_session_data(socket.assigns.session, socket.assigns.user_id)
          
          {:noreply, socket}
        
        {:error, changeset} ->
          error_msg = case changeset.errors do
            [spotify_url: {"must be a valid Spotify track URL", _}] -> 
              "Please enter a valid Spotify track URL"
            [spotify_track_id: {"has already been taken", _}] ->
              "This song has already been submitted to this session"
            _ ->
              "There was an error submitting your song"
          end
          
          {:noreply, put_flash(socket, :error, error_msg)}
      end
    end
  end

  def handle_event("remove_submission", %{"id" => submission_id}, socket) do
    submission = Competitions.get_submission!(submission_id)
    
    if submission.user_id == socket.assigns.user_id do
      case Competitions.delete_submission(submission) do
        {:ok, _} ->
          socket = 
            socket
            |> put_flash(:info, "Submission removed")
            |> load_session_data(socket.assigns.session, socket.assigns.user_id)
          
          {:noreply, socket}
        
        {:error, _} ->
          {:noreply, put_flash(socket, :error, "Could not remove submission")}
      end
    else
      {:noreply, put_flash(socket, :error, "You can only remove your own submissions")}
    end
  end

  def handle_event("vote", %{"submission-id" => submission_id, "points" => points_str}, socket) do
    points = String.to_integer(points_str)
    
    if socket.assigns.points_remaining >= points do
      attrs = %{
        session_id: socket.assigns.session.id,
        voter_id: socket.assigns.user_id,
        submission_id: submission_id,
        points: points
      }
      
      case Competitions.create_vote(attrs) do
        {:ok, _vote} ->
          socket = load_session_data(socket, socket.assigns.session, socket.assigns.user_id)
          {:noreply, socket}
        
        {:error, changeset} ->
          error_msg = case changeset.errors do
            [submission_id: {"cannot vote for your own submission", _}] ->
              "You cannot vote for your own submission"
            _ ->
              "There was an error recording your vote"
          end
          
          {:noreply, put_flash(socket, :error, error_msg)}
      end
    else
      {:noreply, put_flash(socket, :error, "Not enough points remaining")}
    end
  end

  def handle_event("remove_vote", %{"submission-id" => submission_id}, socket) do
    # Find and delete the user's vote for this submission
    user_vote = Enum.find(socket.assigns.user_votes, &(&1.submission_id == String.to_integer(submission_id)))
    
    if user_vote do
      case Competitions.delete_vote(user_vote) do
        {:ok, _} ->
          socket = load_session_data(socket, socket.assigns.session, socket.assigns.user_id)
          {:noreply, socket}
        
        {:error, _} ->
          {:noreply, put_flash(socket, :error, "Could not remove vote")}
      end
    else
      {:noreply, socket}
    end
  end

  @impl true
  def handle_info({:session_status_changed, _status}, socket) do
    # Reload session data when status changes
    session = Competitions.get_session!(socket.assigns.session.id)
    session = Vsvs.Repo.preload(session, season: :club)
    {:noreply, load_session_data(socket, session, socket.assigns.user_id)}
  end

  def handle_info({:session_completed, session}, socket) do
    session = Vsvs.Repo.preload(session, season: :club)
    {:noreply, load_session_data(socket, session, socket.assigns.user_id)}
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  # Private functions

  defp load_session_data(socket, session, user_id) do
    all_submissions = Competitions.list_submissions(session.id)
    user_submissions = Competitions.list_user_submissions(session.id, user_id)
    user_votes = Competitions.list_user_votes(session.id, user_id)
    
    # Calculate remaining points
    points_allocated = Enum.reduce(user_votes, 0, &(&1.points + &2))
    points_remaining = session.voting_points_per_user - points_allocated
    
    # Check if user can vote (must have submitted songs)
    can_vote = Competitions.can_vote?(session.id, user_id)
    
    # For completed sessions, get results
    {session_results, voting_breakdown, grouped_votes} = 
      if session.status == :completed do
        results = Scoring.get_session_leaderboard(session.id)
        breakdown = Scoring.get_session_voting_breakdown(session.id)
        grouped = Enum.group_by(breakdown, &(&1.song_title))
        {results, breakdown, grouped}
      else
        {[], [], %{}}
      end
    
    # Create submission form
    submission_changeset = Competitions.change_submission(%Submission{})
    
    socket
    |> assign(:session, session)
    |> assign(:user_id, user_id)
    |> assign(:all_submissions, all_submissions)
    |> assign(:user_submissions, user_submissions)
    |> assign(:user_votes, user_votes)
    |> assign(:points_remaining, points_remaining)
    |> assign(:can_vote, can_vote)
    |> assign(:session_results, session_results)
    |> assign(:voting_breakdown, voting_breakdown)
    |> assign(:grouped_votes, grouped_votes)
    |> assign(:submission_form, to_form(submission_changeset))
  end

  defp get_user_vote_points(submission_id, user_votes) do
    case Enum.find(user_votes, &(&1.submission_id == submission_id)) do
      nil -> 0
      vote -> vote.points
    end
  end

  defp humanize_status(:submission), do: "Accepting Submissions"
  defp humanize_status(:voting), do: "Voting Open"
  defp humanize_status(:completed), do: "Completed"
  defp humanize_status(:setup), do: "Setting Up"
  defp humanize_status(status), do: Phoenix.Naming.humanize(status)

  defp format_deadline(nil), do: "No deadline"
  defp format_deadline(deadline) do
    case DateTime.diff(deadline, DateTime.utc_now(), :hour) do
      diff when diff < 1 -> "very soon!"
      diff when diff < 24 -> "in #{diff} hours"
      diff -> "in #{div(diff, 24)} days"
    end
  end
end