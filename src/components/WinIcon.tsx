import React from "react";

export default function WinIcon({ className }: any) {
    return (
        <svg
            aria-hidden="true"
            className={`${className}`}
            width="44"
            height="33"
            viewBox="0 0 44 33"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M2 4.28601C2 2.73745 4.06207 2.03543 5.15623 3.19169L11.9947 10.5835L17.8653 4.26536C20.0537 1.91155 23.9463 1.91155 26.1347 4.26536L32.0053 10.5835L38.8438 3.19169C39.9379 2.03543 42 2.73745 42 4.28601V30.5H2L2 4.28601Z"
                className="tw-stroke-crown"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M42 22.5L2 22.5"
                className="tw-stroke-crown"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
