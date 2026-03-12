import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";
import { CLERK_ENABLED, CLERK_PUBLISHABLE_KEY } from "./lib/clerk";

const root = createRoot(document.getElementById("root")!);

if (CLERK_ENABLED) {
  root.render(
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      afterSignInUrl="/conta"
      afterSignUpUrl="/conta"
    >
      <App />
    </ClerkProvider>
  );
} else {
  console.warn("Clerk Publishable Key não configurada — autenticação desativada.");
  root.render(<App />);
}

