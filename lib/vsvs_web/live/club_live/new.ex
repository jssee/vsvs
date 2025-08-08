defmodule VsvsWeb.ClubLive.New do
  use VsvsWeb, :live_view

  alias Vsvs.Clubs
  alias Vsvs.Clubs.Club

  @impl true
  def mount(_params, _session, socket) do
    changeset = Clubs.change_club(%Club{})
    
    {:ok, assign_form(socket, changeset)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="mx-auto max-w-2xl px-4 py-8">
      <div class="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">Create New Club</h1>
          <p class="mt-2 text-sm text-gray-700">
            Start a new musical taste competition with your friends
          </p>
        </div>
        <div class="mt-4 sm:mt-0">
          <.link
            navigate={~p"/dashboard"}
            class="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            ← Back to Dashboard
          </.link>
        </div>
      </div>

      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-6 sm:p-6">
          <.form for={@form} id="club_form" phx-submit="save" phx-change="validate">
            <div class="space-y-6">
              <div>
                <.input
                  field={@form[:name]}
                  type="text"
                  label="Club Name"
                  placeholder="e.g., Music Mavens, Tune Squad"
                  required
                  phx-mounted={JS.focus()}
                />
                <p class="mt-1 text-sm text-gray-500">
                  Choose a memorable name for your club
                </p>
              </div>

              <div>
                <.input
                  field={@form[:description]}
                  type="textarea"
                  label="Description"
                  placeholder="Tell people what this club is about..."
                  required
                  rows="4"
                />
                <p class="mt-1 text-sm text-gray-500">
                  Describe the club's purpose and what kind of music competitions you'll run
                </p>
              </div>

              <div>
                <.input
                  field={@form[:member_limit]}
                  type="number"
                  label="Member Limit"
                  value="20"
                  min="2"
                  max="100"
                />
                <p class="mt-1 text-sm text-gray-500">
                  Maximum number of members (including yourself). You can change this later.
                </p>
              </div>
            </div>

            <div class="mt-8 flex justify-end space-x-3">
              <.link
                navigate={~p"/dashboard"}
                class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </.link>
              <.button 
                type="submit" 
                phx-disable-with="Creating..." 
                class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Create Club
              </.button>
            </div>
          </.form>
        </div>
      </div>

      <!-- Info Section -->
      <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 class="text-sm font-medium text-blue-900 mb-3">What happens next?</h3>
        <ul class="text-sm text-blue-800 space-y-2">
          <li class="flex items-start">
            <span class="flex-shrink-0 h-1.5 w-1.5 bg-blue-400 rounded-full mt-2 mr-3"></span>
            You'll be the club creator and can invite members
          </li>
          <li class="flex items-start">
            <span class="flex-shrink-0 h-1.5 w-1.5 bg-blue-400 rounded-full mt-2 mr-3"></span>
            Create seasons and sessions with different musical themes
          </li>
          <li class="flex items-start">
            <span class="flex-shrink-0 h-1.5 w-1.5 bg-blue-400 rounded-full mt-2 mr-3"></span>
            Members submit songs and vote on each other's picks
          </li>
          <li class="flex items-start">
            <span class="flex-shrink-0 h-1.5 w-1.5 bg-blue-400 rounded-full mt-2 mr-3"></span>
            See who has the best musical taste with leaderboards!
          </li>
        </ul>
      </div>
    </div>
    """
  end

  @impl true
  def handle_event("validate", %{"club" => club_params}, socket) do
    changeset = 
      %Club{}
      |> Clubs.change_club(club_params)
      |> Map.put(:action, :validate)
    
    {:noreply, assign_form(socket, changeset)}
  end

  def handle_event("save", %{"club" => club_params}, socket) do
    # Add current user as creator
    club_params = Map.put(club_params, "creator_id", socket.assigns.current_scope.user.id)
    
    case Clubs.create_club(club_params) do
      {:ok, club} ->
        # Automatically add creator as first member
        {:ok, _membership} = Clubs.join_club(club.id, socket.assigns.current_scope.user.id)
        
        {:noreply,
         socket
         |> put_flash(:info, "Club '#{club.name}' created successfully!")
         |> push_navigate(to: ~p"/clubs/#{club.id}")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign_form(socket, changeset)}
    end
  end

  defp assign_form(socket, %Ecto.Changeset{} = changeset) do
    assign(socket, :form, to_form(changeset))
  end
end