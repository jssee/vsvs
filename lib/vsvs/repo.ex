defmodule Vsvs.Repo do
  use Ecto.Repo,
    otp_app: :vsvs,
    adapter: Ecto.Adapters.Postgres
end
