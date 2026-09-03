import React from "react";
import WarningIcon from "./WarningIcon";
import { useTranslation } from "../i18n/t";

export default function FailedScreen() {
    const { t } = useTranslation();

    return (
        <div className="tw-flex tw-justify-center tw-items-center tw-fixed tw-h-screen tw-w-full tw-top-0 tw-left-0 tw-right-0 tw-bottom-0 tw-bg-scrim/80 tw-z-overlay tw-text-on-dark tw-text-lg">
            <div className="tw-container tw-flex tw-justify-center tw-items-center">
                <WarningIcon />
                <span className="tw-ml-2 tw-font-capsule">
                    {t("something-went-wrong")}
                </span>
            </div>
        </div>
    );
}
