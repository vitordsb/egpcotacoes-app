import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { UNAUTHED_ERR_MSG } from "@/shared/constants";

const loadAnalytics = () => {
  if (typeof document === "undefined") return;
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;
  if (!endpoint || !websiteId) return;

  const script = document.createElement("script");
  script.src = `${endpoint.replace(/\/$/, "")}/umami`;
  script.async = true;
  script.defer = true;
  script.dataset.websiteId = websiteId;
  document.body.appendChild(script);
};

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof Error)) return;
  if (typeof window === "undefined") return;
  if (error.message !== UNAUTHED_ERR_MSG) return;
  window.location.href = "/";
};

window.addEventListener("unhandledrejection", event => {
  redirectToLoginIfUnauthorized(event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);

loadAnalytics();
