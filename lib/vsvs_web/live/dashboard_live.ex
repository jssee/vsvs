defmodule VsvsWeb.DashboardLive do
  use VsvsWeb, :live_view

  alias Vsvs.{Clubs, Competitions}

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket) do
      # Subscribe to updates for user's clubs
      user_clubs = Clubs.list_clubs_for_user(socket.assigns.current_scope.user.id)
      Enum.each(user_clubs, fn club ->
        Phoenix.PubSub.subscribe(Vsvs.PubSub, "club:#{club.id}")
      end)
    end

    {:ok, load_dashboard_data(socket)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="py-8">
        <div class="sm:flex sm:items-center">
          <div class="sm:flex-auto">
            <h1 class="text-2xl font-semibold text-gray-900">
              Welcome, <%= @current_scope.user.display_name %>!
            </h1>
            <p class="mt-2 text-sm text-gray-700">
              Your musical taste competitions dashboard
            </p>
          </div>
          <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <.link
              navigate={~p"/clubs/new"}
              class="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Create Club
            </.link>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                    <span class="text-sm font-medium text-white"><%= length(@clubs) %></span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Clubs Joined
                    </dt>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span class="text-sm font-medium text-white"><%= @active_sessions_count %></span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Active Sessions
                    </dt>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span class="text-sm font-medium text-white"><%= @pending_actions %></span>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Pending Actions
                    </dt>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Clubs Section -->
        <div class="mt-12">
          <h2 class="text-lg font-medium text-gray-900 mb-6">Your Clubs</h2>
          
          <%= if @clubs == [] do %>
            <div class="text-center py-12">
              <div class="mx-auto h-12 w-12 text-gray-400">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h3 class="mt-2 text-sm font-medium text-gray-900">No clubs yet</h3>
              <p class="mt-1 text-sm text-gray-500">Get started by creating or joining a club.</p>
              <div class="mt-6">
                <.link
                  navigate={~p"/clubs/new"}
                  class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Create your first club
                </.link>
              </div>
            </div>
          <% else %>
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <%= for club <- @clubs do %>
                <div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
                  <div class="p-6">
                    <div class="flex items-center justify-between">
                      <h3 class="text-lg font-medium text-gray-900 truncate">
                        <%= club.name %>
                      </h3>
                      <%= if Map.get(@club_stats, club.id, %{})[:active_sessions] > 0 do %>
                        <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Active
                        </span>
                      <% end %>
                    </div>
                    <p class="mt-2 text-sm text-gray-500 line-clamp-2">
                      <%= club.description %>
                    </p>
                    <div class="mt-4 flex items-center justify-between text-sm text-gray-500">
                      <span><%= Map.get(@club_stats, club.id, %{})[:member_count] || 0 %> members</span>
                      <span><%= Map.get(@club_stats, club.id, %{})[:total_sessions] || 0 %> sessions</span>
                    </div>
                    <div class="mt-4">
                      <.link
                        navigate={~p"/clubs/#{club.id}"}
                        class="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                      >
                        View Club →
                      </.link>
                    </div>
                  </div>
                </div>
              <% end %>
            </div>
          <% end %>
        </div>

        <!-- Active Sessions Section -->
        <%= if @active_sessions != [] do %>
          <div class="mt-12">
            <h2 class="text-lg font-medium text-gray-900 mb-6">Active Sessions</h2>
            <div class="bg-white shadow overflow-hidden sm:rounded-md">
              <ul class="divide-y divide-gray-200">
                <%= for session <- @active_sessions do %>
                  <li>
                    <div class="px-4 py-4 flex items-center justify-between">
                      <div class="flex items-center">
                        <div class="flex-shrink-0">
                          <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span class="text-indigo-600 font-medium text-sm">
                              S<%= session.session_number %>
                            </span>
                          </div>
                        </div>
                        <div class="ml-4">
                          <div class="text-sm font-medium text-gray-900">
                            <%= session.theme %>
                          </div>
                          <div class="text-sm text-gray-500">
                            <%= session.club_name %> • Status: <%= humanize_status(session.status) %>
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center space-x-4">
                        <%= if session.status == :submission do %>
                          <span class="text-sm text-yellow-600">
                            Submissions due: <%= format_deadline(session.submission_deadline) %>
                          </span>
                        <% end %>
                        <%= if session.status == :voting do %>
                          <span class="text-sm text-green-600">
                            Voting ends: <%= format_deadline(session.voting_deadline) %>
                          </span>
                        <% end %>
                        <.link
                          navigate={~p"/sessions/#{session.id}"}
                          class="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                        >
                          View →
                        </.link>
                      </div>
                    </div>
                  </li>
                <% end %>
              </ul>
            </div>
          </div>
        <% end %>
      </div>
    </div>
    """
  end

  @impl true
  def handle_info({:session_status_changed, status}, socket) do
    # Reload dashboard when session statuses change
    {:noreply, load_dashboard_data(socket)}
  end

  def handle_info({:session_completed, _session}, socket) do
    # Reload dashboard when sessions complete
    {:noreply, load_dashboard_data(socket)}
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  # Private functions

  defp load_dashboard_data(socket) do
    user_id = socket.assigns.current_scope.user.id
    
    clubs = Clubs.list_clubs_for_user(user_id)
    club_stats = get_club_stats(clubs)
    active_sessions = get_active_sessions(clubs)
    
    socket
    |> assign(:clubs, clubs)
    |> assign(:club_stats, club_stats)
    |> assign(:active_sessions, active_sessions)
    |> assign(:active_sessions_count, length(active_sessions))
    |> assign(:pending_actions, count_pending_actions(user_id, active_sessions))
  end

  defp get_club_stats(clubs) do
    Enum.into(clubs, %{}, fn club ->
      member_count = length(Clubs.list_club_members(club.id))
      seasons = Competitions.list_seasons(club.id)
      total_sessions = Enum.reduce(seasons, 0, fn season, acc ->
        acc + length(Competitions.list_sessions(season.id))
      end)
      active_sessions = count_active_sessions_for_club(club.id)
      
      {club.id, %{
        member_count: member_count,
        total_sessions: total_sessions,
        active_sessions: active_sessions
      }}
    end)
  end

  defp get_active_sessions(clubs) do
    Enum.flat_map(clubs, fn club ->
      seasons = Competitions.list_seasons(club.id)
      Enum.flat_map(seasons, fn season ->
        Competitions.list_sessions(season.id)
        |> Enum.filter(&(&1.status in [:submission, :voting]))
        |> Enum.map(&Map.put(&1, :club_name, club.name))
      end)
    end)
    |> Enum.sort_by(&(&1.inserted_at), {:desc, DateTime})
  end

  defp count_active_sessions_for_club(club_id) do
    seasons = Competitions.list_seasons(club_id)
    Enum.reduce(seasons, 0, fn season, acc ->
      active_count = Competitions.list_sessions(season.id)
      |> Enum.count(&(&1.status in [:submission, :voting]))
      acc + active_count
    end)
  end

  defp count_pending_actions(user_id, active_sessions) do
    Enum.count(active_sessions, fn session ->
      case session.status do
        :submission ->
          # Check if user has submitted required number of songs
          submissions = Competitions.list_user_submissions(session.id, user_id)
          length(submissions) < session.songs_per_user
        
        :voting ->
          # Check if user has allocated all their voting points
          allocated = Competitions.calculate_user_points_allocated(session.id, user_id)
          allocated < session.voting_points_per_user
        
        _ ->
          false
      end
    end)
  end

  defp humanize_status(:submission), do: "Accepting Submissions"
  defp humanize_status(:voting), do: "Voting Open"
  defp humanize_status(:completed), do: "Completed"
  defp humanize_status(status), do: Phoenix.Naming.humanize(status)

  defp format_deadline(nil), do: "No deadline"
  defp format_deadline(deadline) do
    case DateTime.diff(deadline, DateTime.utc_now(), :hour) do
      diff when diff < 1 -> "Very soon!"
      diff when diff < 24 -> "#{diff} hours"
      diff -> "#{div(diff, 24)} days"
    end
  end
end