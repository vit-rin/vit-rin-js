import React from "react";
import LoadingSpinner from "./LoadingSpinner";

export default function LoadingScreen() {
    return (
        <div className="tw-flex tw-justify-center tw-items-center tw-fixed tw-h-screen tw-w-full tw-top-0 tw-left-0 tw-right-0 tw-bottom-0 tw-bg-scrim/80 tw-z-overlay">
            <LoadingSpinner />
        </div>
    );
}
