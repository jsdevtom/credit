export type InitOptions =
  | string // = actorId
  | {
    actorId?: string,
    deferActorId?: boolean,
    freeze?: boolean,
  }
