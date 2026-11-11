/** Application navigation only. Character data and combat remain in their canonical owners. */
export type Screen =
  | "gateway"
  | "characters"
  | "creation"
  | "lobby"
  | "haven"
  | "game"
  | "worlds"
  | "rpg"
  | "profile";
export type Flow = {
  screen: Screen;
  pending: { id: number; target: Screen } | null;
  epoch: number;
};
export type FlowEvent =
  | { type: "navigate"; screen: Screen }
  | { type: "prepare"; target: Screen; id: number }
  | { type: "commit" | "fail"; id: number };
export const initialFlow: Flow = { screen: "gateway", pending: null, epoch: 0 };
export function flowReducer(state: Flow, event: FlowEvent): Flow {
  if (event.type === "navigate")
    return state.pending ? state : { ...state, screen: event.screen };
  if (event.type === "prepare") {
    if (state.pending || event.id <= state.epoch) return state;
    return {
      ...state,
      pending: { id: event.id, target: event.target },
      epoch: event.id,
    };
  }
  if (state.pending?.id !== event.id) return state;
  return {
    ...state,
    screen: event.type === "commit" ? state.pending.target : state.screen,
    pending: null,
  };
}
/** Shortcuts must never consume typing, IME composition or a held key. */
export function shortcutAllowed(
  event: Pick<
    KeyboardEvent,
    "repeat" | "isComposing" | "ctrlKey" | "metaKey" | "altKey"
  >,
  target: EventTarget | null,
) {
  if (
    event.repeat ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return false;
  return !(
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      !!target.closest("input,textarea,select,[contenteditable='true']"))
  );
}
