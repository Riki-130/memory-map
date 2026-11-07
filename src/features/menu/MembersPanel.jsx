import { useEffect, useState } from "react";
import {
  approveJoinRequest,
  createInvite,
  rejectJoinRequest,
  removeMember,
  subscribeJoinRequests
} from "../../firebase/maps.js";
import { copyText } from "../../lib/browser.js";
import Avatar from "./Avatar.jsx";

export default function MembersPanel({ map, user }) {
  const isHost = map.ownerId === user.uid;
  const [requests, setRequests] = useState([]);
  const [invite, setInvite] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!isHost) return undefined;
    return subscribeJoinRequests(map.id, setRequests);
  }, [isHost, map.id]);

  async function handleCreateInvite() {
    setStatus("");
    try {
      setInvite(await createInvite(map, user));
    } catch (error) {
      console.error(error);
      setStatus("招待リンクを作成できませんでした。");
    }
  }

  async function handleCopy() {
    setStatus((await copyText(invite.url)) ? "コピーしました" : "コピーできませんでした");
  }

  async function run(action, message) {
    setStatus("");
    try {
      await action();
    } catch (error) {
      console.error(error);
      setStatus(message);
    }
  }

  const members = Object.entries(map.members || {}).sort(([, a], [, b]) => (a.role === "host" ? -1 : b.role === "host" ? 1 : 0));
  const lineShareUrl = invite && `https://line.me/R/share?text=${encodeURIComponent(`Memory Mapに招待します\n${invite.url}`)}`;

  return (
    <div className="members-panel">
      {isHost && (
        <section>
          <h3>招待</h3>
          {invite ? (
            <div className="invite-box">
              <input readOnly value={invite.url} onFocus={(event) => event.target.select()} />
              <div className="invite-actions">
                <button className="primary-button" type="button" onClick={handleCopy}>コピー</button>
                <a className="line-button" href={lineShareUrl} target="_blank" rel="noreferrer">LINEで送る</a>
              </div>
              <small>有効期限：{invite.expiresAt.toLocaleDateString("ja-JP")}まで。相手がGoogleでログインすると、ここに承認待ちとして表示されます。</small>
            </div>
          ) : (
            <button className="primary-button" type="button" onClick={handleCreateInvite}>招待リンクを作成</button>
          )}
        </section>
      )}

      {isHost && requests.length > 0 && (
        <section>
          <h3>承認待ち（{requests.length}）</h3>
          <ul className="member-list">
            {requests.map((request) => (
              <li key={request.uid}>
                <Avatar member={request} />
                <span className="member-text">
                  <strong>{request.displayName || "名前なし"}</strong>
                  <small>{request.email}</small>
                </span>
                <span className="member-actions">
                  <button className="primary-button small" type="button" onClick={() => run(() => approveJoinRequest(map.id, request), "承認できませんでした。")}>承認</button>
                  <button className="text-button" type="button" onClick={() => run(() => rejectJoinRequest(map.id, request.uid), "却下できませんでした。")}>却下</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3>メンバーリスト（{members.length}）</h3>
        <ul className="member-list">
          {members.map(([uid, member]) => (
            <li key={uid}>
              <Avatar member={member} />
              <span className="member-text">
                <strong>{member.displayName || "名前なし"}{uid === user.uid && "（あなた）"}</strong>
                <small>{member.email}</small>
              </span>
              <span className="member-actions">
                {member.role === "host" ? (
                  <span className="chip">ホスト</span>
                ) : (
                  isHost && (
                    <button
                      className="text-button danger"
                      type="button"
                      onClick={() => {
                        if (confirm(`${member.displayName || member.email} さんをメンバーから外しますか？`)) {
                          run(() => removeMember(map.id, uid), "メンバーを外せませんでした。");
                        }
                      }}
                    >
                      解除
                    </button>
                  )
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {status && <p className="status-text">{status}</p>}
    </div>
  );
}
