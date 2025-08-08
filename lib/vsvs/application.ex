defmodule Vsvs.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      VsvsWeb.Telemetry,
      Vsvs.Repo,
      {DNSCluster, query: Application.get_env(:vsvs, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Vsvs.PubSub},
      # Start a worker by calling: Vsvs.Worker.start_link(arg)
      # {Vsvs.Worker, arg},
      # Start to serve requests, typically the last entry
      VsvsWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Vsvs.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    VsvsWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
