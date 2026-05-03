import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { installChesstrixWasm } from "./game/cpp/installChesstrixWasm";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./theme/theme.css";

void installChesstrixWasm();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
