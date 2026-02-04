import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import {
    createRoutesFromChildren,
    matchRoutes,
    useLocation,
    useNavigationType,
} from "react-router-dom";

export const initSentry = () => {
    const dsn = import.meta.env.VITE_SENTRY_DSN;

    if (!dsn) {
        console.warn("[Sentry] No DSN found. Sentry is disabled.");
        return;
    }

    Sentry.init({
        dsn,
        integrations: [
            Sentry.browserTracingIntegration({
                routingInstrumentation: Sentry.reactRouterV6BrowserTracingIntegration({
                    useEffect,
                    useLocation,
                    useNavigationType,
                    createRoutesFromChildren,
                    matchRoutes
                }),
            }),
            Sentry.replayIntegration(),
        ],
        // Performance Monitoring
        tracesSampleRate: 1.0,
        // Session Replay
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        environment: import.meta.env.MODE,
    });

    console.log("[Sentry] Initialized (v8+ style)");
};

export default Sentry;

