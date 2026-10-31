import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const loginButton = document.querySelector("#google-login");
const logoutButton = document.querySelector("#google-logout");
const authPanel = document.querySelector("#auth-loading");
const authError = document.querySelector("#auth-error");

loginButton.addEventListener("click", async () => {
  authError.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "ログイン画面を開いています...";
  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error(error);
    authError.textContent = `ログインに失敗しました: ${error.code}`;
    loginButton.disabled = false;
    loginButton.textContent = "Googleでログイン";
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
  }
});

getRedirectResult(auth).catch((error) => {
  console.error(error);
  authError.textContent = `ログインに失敗しました: ${error.code}`;
});

onAuthStateChanged(auth, (user) => {
  document.body.classList.toggle("authenticated", Boolean(user));
  authPanel.classList.toggle("visible", !user);
  logoutButton.hidden = !user;
});
