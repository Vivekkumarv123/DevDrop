import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { app } from "./firebase";

const auth = getAuth(app);

export function initAuth(setUser) {
  signInAnonymously(auth)
    .catch((error) => {
      console.error("Anonymous sign-in failed:", error);
    });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      setUser(user);
    }
  });
}
