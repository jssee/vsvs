defmodule VsvsWeb.PageController do
  use VsvsWeb, :controller

  def home(conn, _params) do
    if conn.assigns[:current_scope] && conn.assigns.current_scope.user do
      # User is authenticated, redirect to dashboard
      redirect(conn, to: ~p"/dashboard")
    else
      # Show landing page for unauthenticated users
      render(conn, :home, layout: false)
    end
  end
end
