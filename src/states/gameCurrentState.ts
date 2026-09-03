import { atom } from "recoil";
import { GameState, GameStateValue } from "../constants";

export const gameCurrentState = atom<GameStateValue>({
    key: "gameCurrentState",
    default: GameState.Initialized,
});
