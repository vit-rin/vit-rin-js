import React, { useEffect } from "react";
import { OptionsType } from "../types/options";
import { Options } from "../Options";
import { adsShowingState } from "../states/adsShowingState";
import { useRecoilState } from "recoil";
import { Check } from "../Check";
import { adsCurrentPlaceState } from "../states/adsCurrentPlaceState";

export default function AdsScreen() {
    const options: OptionsType = Options.getInstance().get();

    const [adsShowing, setAdsShowing] = useRecoilState(adsShowingState);
    const [adsCurrentPlace] = useRecoilState(adsCurrentPlaceState);

    const check = Check.getInstance();

    const startCloseInterval = () => {
        const interval = setInterval(async () => {
            if (await check.isViewedAds()) {
                setAdsShowing(false);
                clearInterval(interval);
            }
        }, 1000);

        return interval;
    };

    useEffect(() => {
        const interval = startCloseInterval();
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            {adsShowing && options.autoOpenAds && (
                <div className="tw-flex tw-items-center tw-justify-center tw-fixed tw-h-dvh tw-w-full tw-top-0 tw-inset-x-0 tw-bottom-0 tw-bg-scrim/70 tw-z-ads">
                    <iframe
                        src={`https://ads.vit-rin.com/view?place=${adsCurrentPlace}&page_url=${encodeURIComponent(
                            window.location.origin + window.location.pathname
                        )}`}
                        width={"100%"}
                        height={"100%"}
                        style={{ border: "none" }}
                    />
                </div>
            )}
        </>
    );
}
