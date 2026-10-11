import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { HeroUIProvider } from "@heroui/react";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { store } from "./app/store";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <HeroUIProvider>
          <App />
          <Toaster position="top-right" />
        </HeroUIProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
