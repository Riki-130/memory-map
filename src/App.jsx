import { lazy, Suspense } from "react";
import LoginScreen from "./features/auth/LoginScreen.jsx";
import { useAuth } from "./features/auth/useAuth.js";
import Splash from "./Splash.jsx";

// Firestore, Storage and Google Maps only load after sign-in.
const SignedIn = lazy(() => import("./SignedIn.jsx"));

export default function App() {
  const user = useAuth();

  if (user === undefined) return <Splash />;
  if (!user) return <LoginScreen />;
  return (
    <Suspense fallback={<Splash />}>
      <SignedIn user={user} />
    </Suspense>
  );
}
