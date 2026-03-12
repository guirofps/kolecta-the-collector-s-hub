import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const Root = () => {
  if (PUBLISHABLE_KEY) {
    return (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    );
  }

  // Fallback: render without Clerk when key is not configured
  console.warn("Clerk Publishable Key não configurada — autenticação desativada.");
  return <App />;
};

createRoot(document.getElementById("root")!).render(<Root />);
