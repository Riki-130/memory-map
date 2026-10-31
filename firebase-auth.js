import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
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
const authMessage = document.querySelector("#auth-message");
const copyUrlButton = document.querySelector("#copy-login-url");
const openBrowserButton = document.querySelector("#open-login-browser");

const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isLineBrowser =
  /Line\//i.test(navigator.userAgent) ||
  /Line/i.test(navigator.userAgent) ||
  /line\/|\bLineWebView\b/i.test(document.referrer || "") ||
  document.referrer.includes("line.me");

if (isLineBrowser) {
  loginButton.hidden = true;
  openBrowserButton.hidden = false;
  copyUrlButton.hidden = false;
  authMessage.textContent = "LINE内ブラウザではGoogleログインできません。右上のメニューから「ブラウザで開く」を選択するか、下のボタンを押してください。";
}

openBrowserButton.addEventListener("click", () => {
  window.open(location.href, "_blank", "noopener,noreferrer");
});

copyUrlButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    copyUrlButton.textContent = "コピーしました";
  } catch (error) {
    console.error(error);
    authError.textContent = "URLをコピーできませんでした。LINEの共有メニューからSafariで開いてください。";
  }
});

loginButton.addEventListener("click", async () => {
  authError.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "ログイン画面を開いています...";
  try {
    if (isMobileBrowser) {
      await signInWithRedirect(auth, provider);
      return;
    }
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error(error);
    authError.textContent = `ログインに失敗しました: ${error.code}`;
    loginButton.disabled = false;
    loginButton.textContent = "Googleでログイン";
  }
});

if (!isLineBrowser) {
  getRedirectResult(auth).catch((error) => {
    console.error(error);
    authError.textContent = `ログインに失敗しました: ${error.code}`;
  });
}

logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
  }
});

onAuthStateChanged(auth, (user) => {
  document.body.classList.toggle("authenticated", Boolean(user));
  authPanel.classList.toggle("visible", !user);
  logoutButton.hidden = !user;
});
