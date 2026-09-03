import React from "react";
import RecoilNexus from "recoil-nexus";
import { RecoilRoot } from "recoil";
import Topbar from "./components/Topbar";
import Screen from "./components/Screen";
import { ThemeProvider } from "./theme/ThemeProvider";

const ReactApp: React.FC = () => {
    return (
        <RecoilRoot>
            <RecoilNexus />
            <ThemeProvider>
                <Topbar />
                <Screen />
            </ThemeProvider>
        </RecoilRoot>
    );
};

export default ReactApp;
