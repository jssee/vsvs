You will be acting as a senior/expert software architect. Your objective is to assist with developing a rock solid database schema that will allow us to build the music competition app, “Vsvs”

We are building the mvp of the app right now, so focus on simplicity and fundamentals over being overly exhaustive and covering many edge cases right now. We want to keep the code simple to reason about so that we can expand later.

Vsvs is an app to compete with friends to find out who has the superior music taste and knowledge, and find interesting new tunes along the way. Here is how the app will function:

A `user` creates a `battle`. the creator of the `battle` can then invite other `user`s to compete in the `battle`. Each `battle` is made up of a series of `sessions`. Each `session` has a `vibe`, `winner`, and `submission`s (along with a few other attributes).

The `submission` is 1 or 2 spotify song urls (option set by `battle` creator), every competitor should submit songs that they think fit the `vibe` of the current `session`. The `session` will have a submission deadline, and a voting deadline. These are set by the `battle` creator when they are adding sessions to the `battle`. These 2 phases are meant to give the players time to submit, listen, and vote for their favorite submissions. These 3 phases make up the `phases` of the `session`, and after voting the status of that `session` is `”complete”`

## phases

Here is how phases work: the creator of the `battle` will set the submission phase deadline and the voting phase deadline. once the submission period ends, a spotify playlist made up of the all the different submissions is generated automatically, and the url will be stored in our database so that we can display it for the users to see it and listen to the submissions.

Voting happens after submissions, so you should not be able to set a voting deadline before the submission deadline. players will not be able to submit songs past the submission deadline and they won’t be able to vote past the voting deadline.

<example>
    as the creator of this battle, i want submissions to be due every
    tuesday at 8pm est. and voting to be due on the following friday at 12pm
    est.
</example>

## voting

Here is how the voting works: every competitor gets 3 `stars` per `session`. they use the `stars` to vote for their favorite `submission`. A competitor cannot give their own `submission` a `star`, they can only `star` other players submissions. The competitor with the most `stars` wins that `sessions`, and after all the `sessions` of the `battle` are `”complete”`, the competitor with the most accumulated `stars` is the `battle` champion.

Nothing special has to happen in the case of ties, if 2 or more players end up with the same amount of `stars` at the end of a `sessions`, that’s fine. And if 2 or more players end up with the same amount of total `stars` at the end of the `battle`, then they will be co-champions.

## initial schema

Here is the initial schema:

Battle: - creator: User - status: “active” | “completed” - name: string - players: User[] - active session: Session - champion: User[] - visibility: “public” | “private” - invite url: string

Session: - battle id: string - session number: number - vibe: string - desc: string - winner: User - playlist url: string - submissions: Submission[] - submission deadline: datetime - voting deadline: datetime - phase: “submission” | “listening” | “voting” | “completed” - double submissions: boolean

Submission - user: User - song url: string - submitted at: datetime - stars: Star[]

Star - submission id: ref Submission - voter id: ref User - voted at: datetime
