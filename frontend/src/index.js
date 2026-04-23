import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import "college-erp-theme/css";
import "college-erp-theme/colleges/pvg/config.css";
import "college-erp-theme/js";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
