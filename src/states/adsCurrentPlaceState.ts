import { atom } from "recoil";
import { AdsPlace, AdsPlaceValue } from "../constants";

export const adsCurrentPlaceState = atom<AdsPlaceValue>({
    key: "adsCurrentPlaceState",
    default: AdsPlace.BeforeStartGame,
});
