import React from "react";
import LoadingSpinner from "./LoadingSpinner";

export default function LoadingScreen() {
    return (
        <div className="tw-flex tw-justify-center tw-items-center tw-fixed tw-h-dvh tw-w-full tw-top-0 tw-inset-x-0 tw-bottom-0 tw-bg-scrim/80 tw-z-overlay">
            <LoadingSpinner />
        </div>
    );
}
