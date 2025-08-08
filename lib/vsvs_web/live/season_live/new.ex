defmodule VsvsWeb.SeasonLive.New do
  use VsvsWeb, :live_view

  alias Vsvs.{Competitions, Clubs}
  alias Vsvs.Competitions.Season

  @impl true
  def mount(%{"club_id" => club_id}, _session, socket) do
    club = Clubs.get_club!(club_id)
    user_id = socket.assigns.current_scope.user.id
    
    # Check if user is the creator of this club
    unless Clubs.creator?(club.id, user_id) do
      {:ok,
       socket
       |> put_flash(:error, "Only club creators can create seasons")
       |> push_navigate(to: ~p"/clubs/#{club.id}")}
    else
      changeset = Competitions.change_season(%Season{})
      
      {:ok,
       socket
       |> assign(:club, club)
       |> assign_form(changeset)}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="mx-auto max-w-2xl px-4 py-8">
      <div class="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">Create New Season</h1>
          <p class="mt-2 text-sm text-gray-700">
            Start a new competition season for <%= @club.name %>
          </p>
        </div>
        <div class="mt-4 sm:mt-0">
          <.link
            navigate={~p"/clubs/#{@club.id}"}
            class="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            ← Back to Club
          </.link>
        </div>
      </div>

      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-6 sm:p-6">
          <.form for={@form} id="season_form" phx-submit="save" phx-change="validate">
            <div class="space-y-6">
              <div>
                <.input
                  field={@form[:name]}
                  type="text"
                  label="Season Name"
                  placeholder="e.g., Season 1, Winter 2025, Best of 2024"
                  required
                  phx-mounted={JS.focus()}
                />
                <p class="mt-1 text-sm text-gray-500">
                  Give your season a memorable name
                </p>
              </div>
            </div>

            <div class="mt-8 flex justify-end space-x-3">
              <.link
                navigate={~p"/clubs/#{@club.id}"}
                class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </.link>
              <.button 
                type="submit" 
                phx-disable-with="Creating..." 
                class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Create Season
              </.button>
            </div>
          </.form>
        </div>
      </div>

      <!-- Info Section -->
      <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 class="text-sm font-medium text-blue-900 mb-3">About Seasons</h3>
        <ul class="text-sm text-blue-800 space-y-2">
          <li class="flex items-start">
            <span class="flex-shrink-0 h-1.5 w-1.5 bg-blue-400 rounded-full mt-2 mr-3"></span>
            Seasons are collections of themed musical competitions
          </li>
          <li class="flex items-start">
            <span class="flex-shrink-0 h-1.5 w-1.5 bg-blue-400 rounded-full mt-2 mr-3"></span>
            Each season can have multiple sessions with different themes
          </li>
          <li class="flex items-start">
            <span class="flex-shrink-0 h-1.5 w-1.5 bg-blue-400 rounded-full mt-2 mr-3"></span>
            Track overall leaderboards across all sessions in the season
          </li>
          <li class="flex items-start">
            <span class="flex-shrink-0 h-1.5 w-1.5 bg-blue-400 rounded-full mt-2 mr-3"></span>
            Only one season can be active at a time per club
          </li>
        </ul>
      </div>
    </div>
    """
  end

  @impl true
  def handle_event("validate", %{"season" => season_params}, socket) do
    changeset = 
      %Season{}
      |> Competitions.change_season(season_params)
      |> Map.put(:action, :validate)
    
    {:noreply, assign_form(socket, changeset)}
  end

  def handle_event("save", %{"season" => season_params}, socket) do
    # Add club_id to the params
    season_params = Map.put(season_params, "club_id", socket.assigns.club.id)
    
    case Competitions.create_season(season_params) do
      {:ok, season} ->
        {:noreply,
         socket
         |> put_flash(:info, "Season '#{season.name}' created successfully!")
         |> push_navigate(to: ~p"/clubs/#{socket.assigns.club.id}")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign_form(socket, changeset)}
    end
  end

  defp assign_form(socket, %Ecto.Changeset{} = changeset) do
    assign(socket, :form, to_form(changeset))
  end
end