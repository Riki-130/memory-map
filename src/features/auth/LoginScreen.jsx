import { useState } from "react";
import { copyText, isLineBrowser } from "../../lib/browser.js";
import { signInWithGoogle } from "./useAuth.js";

const loginBg = `${import.meta.env.BASE_URL}images/login-bg.jpg`;

export default function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleLogin() {
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (loginError) {
      console.error(loginError);
      if (loginError.code !== "auth/popup-closed-by-user" && loginError.code !== "auth/cancelled-popup-request") {
        setError(`ログインに失敗しました（${loginError.code}）`);
      }
      setBusy(false);
    }
  }

  function handleOpenBrowser() {
    const opened = window.open(location.href, "_blank");
    if (!opened) {
      setError("ブラウザを開けませんでした。「ログインURLをコピー」を押して、Safariのアドレス欄に貼り付けてください。");
    }
  }

  async function handleCopy() {
    if (await copyText(location.href)) {
      setCopied(true);
    } else {
      setError("URLをコピーできませんでした。LINEの共有メニューからSafariで開いてください。");
    }
  }

  return (
    <div className="login" style={{ "--login-bg": `url(${loginBg})` }}>
      <div className="login-stage">
        <img className="login-art" src={loginBg} alt="Memory map — Since 2026/04/01" />
        <div className="login-actions">
          {isLineBrowser ? (
            <>
              <p className="login-note glass">
                Googleアカウントでのログインが必要です。「ブラウザで開く」を選ぶか、URLをコピーしてSafariに貼り付けてください。
              </p>
              <button className="glass-button" type="button" onClick={handleOpenBrowser}>ブラウザで開く</button>
              <button className="glass-button" type="button" onClick={handleCopy}>
                {copied ? "コピーしました" : "ログインURLをコピー"}
              </button>
            </>
          ) : (
            <button className="glass-button login-button" type="button" onClick={handleLogin} disabled={busy}>
              <GoogleMark />
              {busy ? "ログイン中..." : "Googleでログイン"}
            </button>
          )}
          {error && <p className="login-error glass" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.8-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.8 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
