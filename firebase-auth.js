import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
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

const isLineBrowser =
  /Line\//i.test(navigator.userAgent) ||
  /Line/i.test(navigator.userAgent) ||
  /line\/|\bLineWebView\b/i.test(document.referrer || "") ||
  document.referrer.includes("line.me");

if (isLineBrowser) {
  loginButton.hidden = true;
  openBrowserButton.hidden = false;
  copyUrlButton.hidden = false;
  authMessage.textContent = "Googleアカウントでのログインが必要になります。「ブラウザで開く」を選択するか、「ログインURLをコピー」を選択してブラウザに貼り付けてください。";
}

openBrowserButton.addEventListener("click", () => {
  const openedWindow = window.open(location.href, "_blank");
  if (!openedWindow) {
    authError.textContent = "ブラウザを開けませんでした。「ログインURLをコピー」を押して、Safariのアドレス欄に貼り付けてください。";
  }
});

copyUrlButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    copyUrlButton.textContent = "コピーしました";
  } catch (error) {
    const temporaryInput = document.createElement("textarea");
    temporaryInput.value = location.href;
    temporaryInput.setAttribute("readonly", "");
    temporaryInput.style.position = "fixed";
    temporaryInput.style.opacity = "0";
    document.body.append(temporaryInput);
    temporaryInput.select();
    const copied = document.execCommand("copy");
    temporaryInput.remove();
    if (copied) {
      copyUrlButton.textContent = "コピーしました";
    } else {
      console.error(error);
      authError.textContent = "URLをコピーできませんでした。LINEの共有メニューからSafariで開いてください。";
    }
  }
});

loginButton.addEventListener("click", async () => {
  authError.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "ログイン画面を開いています...";
  try {
    await signInWithPopup(auth, provider);
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

onAuthStateChanged(auth, (user) => {
  document.body.classList.toggle("authenticated", Boolean(user));
  authPanel.classList.toggle("visible", !user);
  logoutButton.hidden = !user;
});
