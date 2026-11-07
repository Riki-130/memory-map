import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/app.css";

// iOS home-screen apps (black-translucent status bar) report a viewport that is shorter
// than the screen by the status-bar inset, leaving a blank strip at the bottom.
// In standalone mode, size full-screen layers to the real screen height instead.
function syncAppHeight() {
  const standalone = navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  const root = document.documentElement;
  if (!standalone) {
    root.style.removeProperty("--app-height");
    return;
  }
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  const screenHeight = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
  root.style.setProperty("--app-height", `${Math.max(window.innerHeight, screenHeight)}px`);
}
syncAppHeight();
window.addEventListener("resize", syncAppHeight);
window.addEventListener("orientationchange", syncAppHeight);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
