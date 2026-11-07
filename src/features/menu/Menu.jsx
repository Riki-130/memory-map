import { useState } from "react";
import PhotoImage from "../pins/PhotoImage.jsx";
import { categoryLabel, pinIcon } from "../pins/categories.js";
import { signOutUser } from "../auth/useAuth.js";
import MembersPanel from "./MembersPanel.jsx";
import CategoryEditor from "./CategoryEditor.jsx";
import PinDetail from "../sheet/PinDetail.jsx";

const TABS = [
  { id: "album", label: "思い出アルバム" },
  { id: "wishlist", label: "行ってみたいリスト" }
];

const charactersImage = `${import.meta.env.BASE_URL}images/couple-characters.png`;

export default function Menu({ open, onClose, map, user, pins, categories, onSelectPin }) {
  const [tab, setTab] = useState("album");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);
  const [wishIcon, setWishIcon] = useState("all");
  const [viewingPinId, setViewingPinId] = useState(null);
  const viewingPin = pins.find((pin) => pin.id === viewingPinId) || null;

  const byTitle = (a, b) => a.title.localeCompare(b.title, "ja");
  // Undated memories always go last, whichever direction is chosen.
  const byVisited = (a, b) => {
    if (!a.visitedAt || !b.visitedAt) return (a.visitedAt ? -1 : 0) + (b.visitedAt ? 1 : 0) || byTitle(a, b);
    const order = a.visitedAt.localeCompare(b.visitedAt);
    return (newestFirst ? -order : order) || byTitle(a, b);
  };
  const memories = pins.filter((pin) => pin.type === "memory").sort(byVisited);
  const wishes = pins.filter((pin) => pin.type === "wishlist").sort(byTitle);
  // Filter buttons only for icons that are actually used on the wishlist.
  const wishIcons = [...new Set(wishes.map(pinIcon))];
  const activeWishIcon = wishIcons.includes(wishIcon) ? wishIcon : "all";
  const visibleWishes = activeWishIcon === "all" ? wishes : wishes.filter((pin) => pinIcon(pin) === activeWishIcon);

  function close() {
    setSettingsOpen(false);
    setViewingPinId(null);
    onClose();
  }

  function goToPin(pinId) {
    setViewingPinId(null);
    onSelectPin(pinId);
  }

  return (
    <>
      <div className={`menu-backdrop${open ? " visible" : ""}`} onClick={close} aria-hidden="true" />
      <aside className={`side-menu${open ? " open" : ""}`} aria-hidden={!open}>
        <header className="menu-header">
          <img src={charactersImage} alt="" />
          <p className="menu-brand">{settingsOpen ? "Settings" : "Menu"}</p>
          <button
            className={`settings-button${settingsOpen ? " active" : ""}`}
            type="button"
            aria-label={settingsOpen ? "設定を閉じる" : "設定"}
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            <GearIcon />
          </button>
          <button className="icon-button menu-close" type="button" aria-label="メニューを閉じる" onClick={close}>×</button>
        </header>

        {viewingPin && !settingsOpen ? (
          <div className="settings-view">
            <button className="text-button back-button" type="button" onClick={() => setViewingPinId(null)}>
              ‹ {viewingPin.type === "memory" ? "思い出アルバム" : "行ってみたいリスト"}に戻る
            </button>
            <div className="menu-content">
              <PinDetail pin={viewingPin} categories={categories} expanded onGoToPin={() => goToPin(viewingPin.id)} />
            </div>
          </div>
        ) : settingsOpen ? (
          <div className="settings-view">
            <button className="text-button back-button" type="button" onClick={() => setSettingsOpen(false)}>‹ メニューに戻る</button>
            <div className="menu-content">
              <CategoryEditor map={map} categories={categories} pins={pins} />
              <MembersPanel map={map} user={user} />
            </div>
            <button className="logout-button" type="button" onClick={signOutUser}>ログアウト</button>
          </div>
        ) : (
          <>
            <nav className="menu-tabs" aria-label="リストの切り替え">
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
                  <>
                    <div className="list-toolbar">
                      <button className="sort-button" type="button" onClick={() => setNewestFirst(!newestFirst)}>
                        ⇅ {newestFirst ? "日付が新しい順" : "日付が古い順"}
                      </button>
                    </div>
                    <PinCards pins={memories} categories={categories} onSelectPin={setViewingPinId} showDate />
                  </>
                )
              )}

              {tab === "wishlist" && (
                wishes.length === 0 ? (
                  <p className="empty">行ってみたい場所を追加すると、ここに並びます。</p>
                ) : (
                  <>
                    <div className="icon-filter" role="group" aria-label="カテゴリで絞り込み">
                      <button type="button" className={activeWishIcon === "all" ? "active" : ""} onClick={() => setWishIcon("all")}>すべて</button>
                      {wishIcons.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          className={activeWishIcon === icon ? "active" : ""}
                          aria-label={categoryLabel(icon, categories)}
                          title={categoryLabel(icon, categories)}
                          onClick={() => setWishIcon(icon)}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    <PinCards pins={visibleWishes} categories={categories} onSelectPin={setViewingPinId} />
                  </>
                )
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

// Cover is the first photo when there is one, otherwise the pin's category icon.
function PinCards({ pins, categories, onSelectPin, showDate }) {
  return (
    <div className="album-grid">
      {pins.map((pin) => (
        <button key={pin.id} type="button" className="album-card" onClick={() => onSelectPin(pin.id)}>
          {pin.photos?.[0] ? (
            <PhotoImage className="album-cover" path={pin.photos[0].thumbPath} />
          ) : (
            <div className="album-cover album-cover-empty">{pinIcon(pin)}</div>
          )}
          <strong>{pin.title}</strong>
          <span>
            {showDate ? (pin.visitedAt ? pin.visitedAt.replaceAll("-", "/") : "日付なし") : categoryLabel(pinIcon(pin), categories)}
            {pin.photos?.length ? ` · 📷${pin.photos.length}` : ""}
          </span>
        </button>
      ))}
    </div>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2.4h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.24-1.12.55-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.67 8.88a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.39 1.04.7 1.62.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.58-.24 1.12-.55 1.62-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"
      />
    </svg>
  );
}
