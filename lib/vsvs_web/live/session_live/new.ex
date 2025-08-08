defmodule VsvsWeb.SessionLive.New do
  use VsvsWeb, :live_view

  alias Vsvs.{Competitions, Clubs}
  alias Vsvs.Competitions.Session

  @impl true
  def mount(%{"season_id" => season_id}, _session, socket) do
    season = Competitions.get_season!(season_id)
    season = Vsvs.Repo.preload(season, :club)
    user_id = socket.assigns.current_scope.user.id
    
    # Check if user is the creator of this club
    unless Clubs.creator?(season.club.id, user_id) do
      {:ok,
       socket
       |> put_flash(:error, "Only club creators can create sessions")
       |> push_navigate(to: ~p"/clubs/#{season.club.id}")}
    else
      # Get existing sessions to determine the next session number
      existing_sessions = Competitions.list_sessions(season.id)
      next_session_number = length(existing_sessions) + 1
      
      changeset = Competitions.change_session(%Session{session_number: next_session_number})
      
      {:ok,
       socket
       |> assign(:season, season)
       |> assign(:next_session_number, next_session_number)
       |> assign_form(changeset)}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="mx-auto max-w-2xl px-4 py-8">
      <div class="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">Create New Session</h1>
          <p class="mt-2 text-sm text-gray-700">
            Session <%= @next_session_number %> for <%= @season.name %> in <%= @season.club.name %>
          </p>
        </div>
        <div class="mt-4 sm:mt-0">
          <.link
            navigate={~p"/clubs/#{@season.club.id}"}
            class="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            ← Back to Club
          </.link>
        </div>
      </div>

      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-6 sm:p-6">
          <.form for={@form} id="session_form" phx-submit="save" phx-change="validate">
            <div class="space-y-6">
              <!-- Theme -->
              <div>
                <.input
                  field={@form[:theme]}
                  type="text"
                  label="Session Theme"
                  placeholder="e.g., Songs about Rain, 90s Hip-Hop, Guilty Pleasures"
                  required
                  phx-mounted={JS.focus()}
                />
                <p class="mt-1 text-sm text-gray-500">
                  What's the musical theme for this session?
                </p>
              </div>

              <!-- Configuration -->
              <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <.input
                    field={@form[:songs_per_user]}
                    type="number"
                    label="Songs per User"
                    value="1"
                    min="1"
                    max="5"
                  />
                  <p class="mt-1 text-sm text-gray-500">
                    How many songs can each user submit?
                  </p>
                </div>

                <div>
                  <.input
                    field={@form[:voting_points_per_user]}
                    type="number"
                    label="Voting Points per User"
                    value="10"
                    min="5"
                    max="100"
                  />
                  <p class="mt-1 text-sm text-gray-500">
                    Total points each user can distribute
                  </p>
                </div>
              </div>

              <!-- Deadlines -->
              <div class="space-y-4">
                <h3 class="text-lg font-medium text-gray-900">Deadlines</h3>
                <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <.input
                      field={@form[:submission_deadline]}
                      type="datetime-local"
                      label="Submission Deadline"
                    />
                    <p class="mt-1 text-sm text-gray-500">
                      When do submissions close?
                    </p>
                  </div>

                  <div>
                    <.input
                      field={@form[:voting_deadline]}
                      type="datetime-local"
                      label="Voting Deadline"
                    />
                    <p class="mt-1 text-sm text-gray-500">
                      When does voting end?
                    </p>
                  </div>
                </div>
                <div class="rounded-md bg-yellow-50 p-4">
                  <p class="text-sm text-yellow-800">
                    <strong>Note:</strong> The session will automatically transition from setup → submission → voting → completed based on these deadlines.
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-8 flex justify-end space-x-3">
              <.link
                navigate={~p"/clubs/#{@season.club.id}"}
                class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </.link>
              <.button 
                type="submit" 
                phx-disable-with="Creating..." 
                class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Create Session
              </.button>
            </div>
          </.form>
        </div>
      </div>

      <!-- Session Flow Info -->
      <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 class="text-sm font-medium text-blue-900 mb-3">Session Flow</h3>
        <div class="flex items-center space-x-4 text-sm text-blue-800">
          <div class="flex items-center space-x-2">
            <span class="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">1</span>
            <span>Setup</span>
          </div>
          <span>→</span>
          <div class="flex items-center space-x-2">
            <span class="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center text-xs font-medium">2</span>
            <span>Submission</span>
          </div>
          <span>→</span>
          <div class="flex items-center space-x-2">
            <span class="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-xs font-medium">3</span>
            <span>Voting</span>
          </div>
          <span>→</span>
          <div class="flex items-center space-x-2">
            <span class="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-medium">4</span>
            <span>Results</span>
          </div>
        </div>
      </div>
    </div>
    """
  end

  @impl true
  def handle_event("validate", %{"session" => session_params}, socket) do
    changeset = 
      %Session{}
      |> Competitions.change_session(session_params)
      |> Map.put(:action, :validate)
    
    {:noreply, assign_form(socket, changeset)}
  end

  def handle_event("save", %{"session" => session_params}, socket) do
    # Add season_id and session_number to the params
    session_params = 
      session_params
      |> Map.put("season_id", socket.assigns.season.id)
      |> Map.put("session_number", socket.assigns.next_session_number)
    
    case Competitions.create_session(session_params) do
      {:ok, session} ->
        # Schedule background jobs for deadline transitions if deadlines are set
        schedule_session_transitions(session)
        
        {:noreply,
         socket
         |> put_flash(:info, "Session '#{session.theme}' created successfully!")
         |> push_navigate(to: ~p"/sessions/#{session.id}")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign_form(socket, changeset)}
    end
  end

  defp assign_form(socket, %Ecto.Changeset{} = changeset) do
    assign(socket, :form, to_form(changeset))
  end

  defp schedule_session_transitions(session) do
    # Schedule submission to voting transition
    if session.submission_deadline do
      %{session_id: session.id, transition: "submission_to_voting"}
      |> Vsvs.Workers.SessionTransitionWorker.new(scheduled_at: session.submission_deadline)
      |> Oban.insert()
    end

    # Schedule voting to completed transition
    if session.voting_deadline do
      %{session_id: session.id, transition: "voting_to_completed"}
      |> Vsvs.Workers.SessionTransitionWorker.new(scheduled_at: session.voting_deadline)
      |> Oban.insert()
    end
  end
end