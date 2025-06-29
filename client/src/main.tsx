import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ClerkProvider } from '@clerk/clerk-react';

// Import your Clerk Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file');
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider 
    publishableKey={PUBLISHABLE_KEY} 
    afterSignOutUrl="/"
    appearance={{
      variables: {
        colorPrimary: "#e11d48", // Primary color matching your theme
        colorBackground: "#ffffff",
        colorText: "#1f2937",
        borderRadius: "0.5rem"
      },
      elements: {
        formButtonPrimary: "bg-primary hover:bg-primary/90 text-white",
        card: "shadow-lg border border-gray-200",
        headerTitle: "text-xl font-bold text-gray-900",
        headerSubtitle: "text-gray-600",
        socialButtonsBlockButton: "border border-gray-300 hover:bg-gray-50",
        formFieldInput: "border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary",
        footerActionLink: "text-primary hover:text-primary/80"
      },
      layout: {
        showOptionalFields: false
      }
    }}
    signInFallbackRedirectUrl="/"
    signUpFallbackRedirectUrl="/"
  >
    <App />
  </ClerkProvider>
);