defmodule VsvsWeb.ClubLive.Show do
  use VsvsWeb, :live_view

  alias Vsvs.{Clubs, Competitions, Scoring}

  @impl true
  def mount(%{"id" => club_id}, _session, socket) do
    if connected?(socket) do
      Phoenix.PubSub.subscribe(Vsvs.PubSub, "club:#{club_id}")
    end
    
    club = Clubs.get_club!(club_id)
    user_id = socket.assigns.current_scope.user.id
    
    # Check if user is a member
    is_member = Clubs.member?(club.id, user_id)
    is_creator = Clubs.creator?(club.id, user_id)
    
    if is_member do
      {:ok, load_club_data(socket, club, user_id, is_creator)}
    else
      {:ok,
       socket
       |> put_flash(:error, "You don't have access to this club")
       |> push_navigate(to: ~p"/dashboard")}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="mx-auto max-w-7xl px-4 py-8">
      <!-- Header -->
      <div class="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <div class="flex items-center space-x-3">
            <h1 class="text-2xl font-semibold text-gray-900"><%= @club.name %></h1>
            <%= if @is_creator do %>
              <span class="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                Creator
              </span>
            <% end %>
          </div>
          <p class="mt-2 text-sm text-gray-700"><%= @club.description %></p>
          <div class="mt-2 flex items-center space-x-4 text-sm text-gray-500">
            <span><%= length(@members) %> members</span>
            <span>•</span>
            <span>Created <%= Calendar.strftime(@club.inserted_at, "%B %d, %Y") %></span>
          </div>
        </div>
        <div class="mt-4 sm:mt-0 flex space-x-3">
          <.link
            navigate={~p"/dashboard"}
            class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            ← Dashboard
          </.link>
          <%= if @is_creator do %>
            <.button
              phx-click="new_season"
              class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              New Season
            </.button>
          <% end %>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Current Season -->
          <%= if @current_season do %>
            <div class="bg-white shadow sm:rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-medium text-gray-900">
                    <%= @current_season.name %> 
                    <span class="text-sm text-gray-500">(Current)</span>
                  </h3>
                  <%= if @is_creator do %>
                    <.button
                      phx-click="new_session"
                      phx-value-season-id={@current_season.id}
                      class="text-sm"
                    >
                      New Session
                    </.button>
                  <% end %>
                </div>
                
                <!-- Season Leaderboard -->
                <%= if @season_leaderboard != [] do %>
                  <div class="mt-4">
                    <h4 class="text-sm font-medium text-gray-700 mb-3">Season Leaderboard</h4>
                    <div class="space-y-2">
                      <%= for {entry, index} <- Enum.with_index(@season_leaderboard, 1) do %>
                        <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                          <div class="flex items-center space-x-3">
                            <span class="text-sm font-medium text-gray-900">
                              #<%= index %>
                            </span>
                            <span class="text-sm text-gray-900">
                              <%= entry.display_name %>
                            </span>
                          </div>
                          <div class="text-sm text-gray-500">
                            <%= entry.total_points_received %> points
                            <span class="text-xs">(<%= entry.sessions_participated %> sessions)</span>
                          </div>
                        </div>
                      <% end %>
                    </div>
                  </div>
                <% end %>
              </div>
            </div>
          <% else %>
            <%= if @is_creator do %>
              <div class="text-center py-12 bg-white shadow sm:rounded-lg">
                <div class="mx-auto h-12 w-12 text-gray-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.712-3.714M14 40v-4a9.971 9.971 0 01.712-3.714M28 16a4 4 0 11-8 0 4 4 0 018 0zm-8 8a6 6 0 016 6v4H14v-4a6 6 0 016-6z"/>
                  </svg>
                </div>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No seasons yet</h3>
                <p class="mt-1 text-sm text-gray-500">Get started by creating your first season.</p>
                <div class="mt-6">
                  <.button phx-click="new_season">
                    Create First Season
                  </.button>
                </div>
              </div>
            <% end %>
          <% end %>

          <!-- Sessions -->
          <%= if @sessions != [] do %>
            <div class="bg-white shadow sm:rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Sessions</h3>
                <div class="space-y-4">
                  <%= for session <- @sessions do %>
                    <div class="border border-gray-200 rounded-lg p-4">
                      <div class="flex items-center justify-between">
                        <div>
                          <h4 class="text-sm font-medium text-gray-900">
                            Session <%= session.session_number %>: <%= session.theme %>
                          </h4>
                          <p class="text-sm text-gray-500 mt-1">
                            Status: <%= humanize_status(session.status) %>
                            <%= if session.status == :submission and session.submission_deadline do %>
                              • Submissions due <%= format_deadline(session.submission_deadline) %>
                            <% end %>
                            <%= if session.status == :voting and session.voting_deadline do %>
                              • Voting ends <%= format_deadline(session.voting_deadline) %>
                            <% end %>
                          </p>
                        </div>
                        <div class="flex items-center space-x-2">
                          <%= if session.status in [:submission, :voting] do %>
                            <.link
                              navigate={~p"/sessions/#{session.id}"}
                              class="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                            >
                              Participate →
                            </.link>
                          <% else %>
                            <.link
                              navigate={~p"/sessions/#{session.id}"}
                              class="text-gray-600 hover:text-gray-500 text-sm"
                            >
                              View Results
                            </.link>
                          <% end %>
                        </div>
                      </div>
                    </div>
                  <% end %>
                </div>
              </div>
            </div>
          <% end %>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Members -->
          <div class="bg-white shadow sm:rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">
                Members (<%= length(@members) %>)
              </h3>
              <div class="space-y-3">
                <%= for member <- @members do %>
                  <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0 h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span class="text-xs font-medium text-gray-700">
                        <%= String.first(member.display_name) %>
                      </span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 truncate">
                        <%= member.display_name %>
                        <%= if member.id == @club.creator_id do %>
                          <span class="text-xs text-gray-500">(Creator)</span>
                        <% end %>
                      </p>
                    </div>
                  </div>
                <% end %>
              </div>
              
              <%= if @is_creator do %>
                <div class="mt-6 pt-6 border-t border-gray-200">
                  <.button 
                    phx-click="invite_member"
                    class="w-full text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Invite Members
                  </.button>
                </div>
              <% end %>
            </div>
          </div>

          <!-- Club Stats -->
          <div class="bg-white shadow sm:rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Club Stats</h3>
              <dl class="space-y-3">
                <div class="flex justify-between">
                  <dt class="text-sm text-gray-500">Total Seasons</dt>
                  <dd class="text-sm font-medium text-gray-900"><%= length(@all_seasons) %></dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-sm text-gray-500">Total Sessions</dt>
                  <dd class="text-sm font-medium text-gray-900"><%= @total_sessions %></dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-sm text-gray-500">Active Sessions</dt>
                  <dd class="text-sm font-medium text-gray-900"><%= @active_sessions_count %></dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
    """
  end

  @impl true
  def handle_event("new_season", _params, socket) do
    # For now, just show a flash message - we'll implement this later
    {:noreply, put_flash(socket, :info, "Season creation coming soon!")}
  end

  def handle_event("new_session", %{"season-id" => season_id}, socket) do
    # For now, just show a flash message - we'll implement this later
    {:noreply, put_flash(socket, :info, "Session creation coming soon!")}
  end

  def handle_event("invite_member", _params, socket) do
    # For now, just show a flash message - we'll implement this later
    {:noreply, put_flash(socket, :info, "Member invitation coming soon!")}
  end

  @impl true
  def handle_info(_msg, socket), do: {:noreply, socket}

  # Private functions

  defp load_club_data(socket, club, user_id, is_creator) do
    members = Clubs.list_club_members(club.id)
    all_seasons = Competitions.list_seasons(club.id)
    current_season = List.first(all_seasons)
    
    {sessions, season_leaderboard} = if current_season do
      sessions = Competitions.list_sessions(current_season.id)
      leaderboard = Scoring.get_season_leaderboard(current_season.id)
      {sessions, leaderboard}
    else
      {[], []}
    end
    
    active_sessions_count = Enum.count(sessions, &(&1.status in [:submission, :voting]))
    total_sessions = Enum.reduce(all_seasons, 0, fn season, acc ->
      acc + length(Competitions.list_sessions(season.id))
    end)
    
    socket
    |> assign(:club, club)
    |> assign(:members, members)
    |> assign(:all_seasons, all_seasons)
    |> assign(:current_season, current_season)
    |> assign(:sessions, sessions)
    |> assign(:season_leaderboard, season_leaderboard)
    |> assign(:is_creator, is_creator)
    |> assign(:user_id, user_id)
    |> assign(:active_sessions_count, active_sessions_count)
    |> assign(:total_sessions, total_sessions)
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