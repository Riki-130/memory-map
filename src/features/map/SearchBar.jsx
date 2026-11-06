import { useState } from "react";
import { searchPlaces } from "../../lib/places.js";

export default function SearchBar({ onOpenMenu, onPickPlace }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setBusy(true);
    setMessage("");
    try {
      const places = await searchPlaces(trimmed);
      setResults(places);
      if (places.length === 0) setMessage("見つかりませんでした。別のキーワードで試してください。");
    } catch (error) {
      console.error(error);
      setResults(null);
      setMessage("検索できませんでした。通信状況を確認して、もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  function pick(place) {
    setResults(null);
    setMessage("");
    onPickPlace(place);
  }

  return (
    <div className="search-area">
      <form className="search-bar glass" onSubmit={handleSubmit}>
        <button className="icon-button menu-button" type="button" aria-label="メニューを開く" onClick={onOpenMenu}>
          <span /><span /><span />
        </button>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setMessage("")}
          placeholder="住所や店名を検索"
          aria-label="住所や店名を検索"
          enterKeyHint="search"
        />
        <button className="search-button" type="submit" disabled={busy}>
          {busy ? "検索中" : "ピン検索"}
        </button>
      </form>

      {(results?.length > 0 || message) && (
        <div className="search-results glass" role="listbox">
          {message && <p className="search-message">{message}</p>}
          {results?.map((place) => (
            <button key={place.id} type="button" className="search-result" onClick={() => pick(place)}>
              <strong>{place.name}</strong>
              <span>{place.address}</span>
            </button>
          ))}
          <button type="button" className="search-close" onClick={() => { setResults(null); setMessage(""); }}>
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}
