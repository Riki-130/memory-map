import { useEffect, useState } from "react";
import { getInvite, requestToJoin, subscribeMyJoinRequest } from "../../firebase/maps.js";
import { signOutUser } from "../auth/useAuth.js";

// Shown after signing in from an invite link until the host approves the request.
// Approval adds the user to the map, which useMembership picks up automatically.
export default function JoinScreen({ user, invite, onDismiss }) {
  const [details, setDetails] = useState(undefined);
  const [request, setRequest] = useState(undefined);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getInvite(invite.mapId, invite.token)
      .then(setDetails)
      .catch((loadError) => {
        console.error(loadError);
        setDetails(null);
      });
    return subscribeMyJoinRequest(invite.mapId, user.uid, setRequest);
  }, [invite, user.uid]);

  async function handleRequest() {
    setSending(true);
    setError("");
    try {
      await requestToJoin(invite.mapId, invite.token, user);
    } catch (requestError) {
      console.error(requestError);
      setError("参加リクエストを送れませんでした。招待リンクの有効期限が切れている可能性があります。");
    } finally {
      setSending(false);
    }
  }

  let body;
  if (details === undefined) {
    body = <p>招待を確認しています...</p>;
  } else if (!details || !details.valid) {
    body = <p>この招待リンクは無効か、有効期限が切れています。ホストに新しいリンクを送ってもらってください。</p>;
  } else if (request) {
    body = (
      <>
        <p><strong>{details.ownerName || "ホスト"}</strong> さんの承認を待っています。</p>
        <p className="muted">承認されると、自動で「{details.mapName}」が開きます。この画面は閉じても大丈夫です。</p>
      </>
    );
  } else {
    body = (
      <>
        <p><strong>{details.ownerName || "ホスト"}</strong> さんから「{details.mapName}」に招待されています。</p>
        <p className="muted">{user.displayName}（{user.email}）として参加をリクエストします。</p>
        <button className="primary-button" type="button" onClick={handleRequest} disabled={sending}>
          {sending ? "送信中..." : "参加をリクエスト"}
        </button>
      </>
    );
  }

  return (
    <div className="center-screen">
      <div className="card glass-card">
        <h1 className="brand">Memory Map</h1>
        {body}
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="card-links">
          <button className="text-button" type="button" onClick={onDismiss}>自分の地図を開く</button>
          <button className="text-button" type="button" onClick={signOutUser}>別のアカウントでログイン</button>
        </div>
      </div>
    </div>
  );
}
