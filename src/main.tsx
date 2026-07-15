import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { ptBR } from "@clerk/localizations";
import App from "./App.tsx";
import "./index.css";
import { CLERK_ENABLED, CLERK_PUBLISHABLE_KEY, kolectaClerkAppearance } from "./lib/clerk";

const root = createRoot(document.getElementById("root")!);

if (CLERK_ENABLED) {
  root.render(
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={kolectaClerkAppearance}
      localization={ptBR}
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

