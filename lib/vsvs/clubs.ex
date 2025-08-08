defmodule Vsvs.Clubs do
  @moduledoc """
  The Clubs context.
  """

  import Ecto.Query, warn: false
  alias Vsvs.Repo

  alias Vsvs.Clubs.{Club, ClubMembership}

  ## Club CRUD

  @doc """
  Returns the list of clubs.

  ## Examples

      iex> list_clubs()
      [%Club{}, ...]

  """
  def list_clubs do
    Repo.all(Club)
  end

  @doc """
  Gets a single club.

  Raises `Ecto.NoResultsError` if the Club does not exist.

  ## Examples

      iex> get_club!(123)
      %Club{}

      iex> get_club!(456)
      ** (Ecto.NoResultsError)

  """
  def get_club!(id), do: Repo.get!(Club, id)

  @doc """
  Creates a club.

  ## Examples

      iex> create_club(%{field: value})
      {:ok, %Club{}}

      iex> create_club(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_club(attrs \\ %{}) do
    %Club{}
    |> Club.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a club.

  ## Examples

      iex> update_club(club, %{field: new_value})
      {:ok, %Club{}}

      iex> update_club(club, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_club(%Club{} = club, attrs) do
    club
    |> Club.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a club.

  ## Examples

      iex> delete_club(club)
      {:ok, %Club{}}

      iex> delete_club(club)
      {:error, %Ecto.Changeset{}}

  """
  def delete_club(%Club{} = club) do
    Repo.delete(club)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking club changes.

  ## Examples

      iex> change_club(club)
      %Ecto.Changeset{data: %Club{}}

  """
  def change_club(%Club{} = club, attrs \\ %{}) do
    Club.changeset(club, attrs)
  end

  ## Club Membership functions

  @doc """
  Gets clubs for a specific user.
  """
  def list_clubs_for_user(user_id) do
    from(c in Club,
      join: cm in ClubMembership,
      on: c.id == cm.club_id,
      where: cm.user_id == ^user_id,
      order_by: c.name
    )
    |> Repo.all()
  end

  @doc """
  Gets members of a club.
  """
  def list_club_members(club_id) do
    from(u in Vsvs.Accounts.User,
      join: cm in ClubMembership,
      on: u.id == cm.user_id,
      where: cm.club_id == ^club_id,
      order_by: u.display_name
    )
    |> Repo.all()
  end

  @doc """
  Adds a user to a club.
  """
  def join_club(club_id, user_id) do
    %ClubMembership{}
    |> ClubMembership.changeset(%{club_id: club_id, user_id: user_id})
    |> Repo.insert()
  end

  @doc """
  Removes a user from a club.
  """
  def leave_club(club_id, user_id) do
    from(cm in ClubMembership,
      where: cm.club_id == ^club_id and cm.user_id == ^user_id
    )
    |> Repo.delete_all()
  end

  @doc """
  Checks if a user is a member of a club.
  """
  def member?(club_id, user_id) do
    from(cm in ClubMembership,
      where: cm.club_id == ^club_id and cm.user_id == ^user_id
    )
    |> Repo.exists?()
  end

  @doc """
  Checks if a user is the creator of a club.
  """
  def creator?(club_id, user_id) do
    from(c in Club,
      where: c.id == ^club_id and c.creator_id == ^user_id
    )
    |> Repo.exists?()
  end
end