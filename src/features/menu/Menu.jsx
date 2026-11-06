import { useState } from "react";
import PhotoImage from "../pins/PhotoImage.jsx";
import { categoryById } from "../pins/categories.js";
import { signOutUser } from "../auth/useAuth.js";
import MembersPanel from "./MembersPanel.jsx";
import Avatar from "./Avatar.jsx";

const TABS = [
  { id: "album", label: "思い出アルバム" },
  { id: "wishlist", label: "行ってみたい" },
  { id: "members", label: "メンバー" }
];

const charactersImage = `${import.meta.env.BASE_URL}images/couple-characters.png`;

export default function Menu({ open, onClose, map, user, pins, onSelectPin }) {
  const [tab, setTab] = useState("album");
  const members = Object.entries(map.members || {});

  const memories = pins
    .filter((pin) => pin.type === "memory")
    .sort((a, b) => (b.visitedAt || "").localeCompare(a.visitedAt || "") || a.title.localeCompare(b.title, "ja"));
  const wishes = pins
    .filter((pin) => pin.type === "wishlist")
    .sort((a, b) => a.title.localeCompare(b.title, "ja"));

  return (
    <>
      <div className={`menu-backdrop${open ? " visible" : ""}`} onClick={onClose} aria-hidden="true" />
      <aside className={`side-menu${open ? " open" : ""}`} aria-hidden={!open}>
        <header className="menu-header">
          <img src={charactersImage} alt="" />
          <div>
            <p className="menu-brand">Memory Map</p>
            <p className="menu-map-name">{map.name}</p>
            <div className="avatar-row">
              {members.map(([uid, member]) => (
                <Avatar key={uid} member={member} />
              ))}
            </div>
          </div>
          <button className="icon-button menu-close" type="button" aria-label="メニューを閉じる" onClick={onClose}>×</button>
        </header>

        <nav className="menu-tabs">
          {TABS.map((item) => (
            <button key={item.id} type="button" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="menu-content">
          {tab === "album" && (
            memories.length === 0 ? (
              <p className="empty">まだ思い出がありません。地図を長押しするか、検索してピンを追加しましょう。</p>
            ) : (
              <div className="album-grid">
                {memories.map((pin) => (
                  <button key={pin.id} type="button" className="album-card" onClick={() => onSelectPin(pin.id)}>
                    {pin.photos?.[0] ? (
                      <PhotoImage className="album-cover" path={pin.photos[0].thumbPath} />
                    ) : (
                      <div className="album-cover album-cover-empty">{pin.icon || categoryById(pin.category).icon}</div>
                    )}
                    <strong>{pin.title}</strong>
                    <span>{pin.visitedAt ? pin.visitedAt.replaceAll("-", "/") : "日付なし"}{pin.photos?.length ? ` · 📷${pin.photos.length}` : ""}</span>
                  </button>
                ))}
              </div>
            )
          )}

          {tab === "wishlist" && (
            wishes.length === 0 ? (
              <p className="empty">行ってみたい場所を追加すると、ここに並びます。</p>
            ) : (
              <ul className="wish-list">
                {wishes.map((pin) => (
                  <li key={pin.id}>
                    <button type="button" onClick={() => onSelectPin(pin.id)}>
                      <span className="wish-icon">{pin.icon || categoryById(pin.category).icon}</span>
                      <span>
                        <strong>{pin.title}</strong>
                        <small>{pin.address}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === "members" && <MembersPanel map={map} user={user} />}
        </div>

        <button className="logout-button" type="button" onClick={signOutUser}>ログアウト</button>
      </aside>
    </>
  );
}
