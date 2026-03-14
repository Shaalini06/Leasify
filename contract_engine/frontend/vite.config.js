import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://127.0.0.1:8000",
      "/upload-contract": "http://127.0.0.1:8000",
      "/extract-sla": "http://127.0.0.1:8000",
      "/analyze-contract": "http://127.0.0.1:8000",
      "/vehicle-details": "http://127.0.0.1:8000",
      "/negotiation-assistant": "http://127.0.0.1:8000",
    },
  },
});
