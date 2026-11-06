// LINE's in-app browser cannot complete Google sign-in, so the login screen sends users
// to an external browser instead (requirements §4).
export const isLineBrowser =
  /\bLine\//i.test(navigator.userAgent) ||
  /\bLineWebView\b/i.test(navigator.userAgent) ||
  (document.referrer || "").includes("line.me");

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}
