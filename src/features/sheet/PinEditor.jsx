import { useRef, useState } from "react";
import { deletePhotoFiles, savePin, uploadPhoto } from "../../firebase/pins.js";
import { MAX_PHOTOS_PER_PIN } from "../../config.js";
import PhotoImage from "../pins/PhotoImage.jsx";
import { CATEGORIES, ICON_CHOICES, PIN_TYPES, categoryById } from "../pins/categories.js";

function toForm(pin) {
  return {
    title: pin.title || "",
    address: pin.address || "",
    type: pin.type || "memory",
    category: pin.category || "other",
    icon: pin.icon || categoryById(pin.category).icon,
    visitedAt: pin.visitedAt || "",
    memo: pin.memo || "",
    videoLinks: (pin.videoLinks || []).join("\n")
  };
}

export default function PinEditor({ mapId, pinId, pin, isNew, user, loadingAddress, onSaved, onCancel }) {
  const [form, setForm] = useState(() => toForm(pin));
  const [photos, setPhotos] = useState(pin.photos || []);
  const [removedPhotos, setRemovedPhotos] = useState([]);
  const [uploads, setUploads] = useState([]); // { name, progress }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const uploadedHereRef = useRef([]); // photos uploaded in this session, cleaned up on cancel
  const fileInputRef = useRef(null);

  // The draft's name/address can arrive after the editor opens (reverse geocoding).
  const [seededFrom, setSeededFrom] = useState(pin);
  if (seededFrom !== pin) {
    setSeededFrom(pin);
    setForm((current) => ({
      ...current,
      title: current.title || pin.title || "",
      address: current.address || pin.address || "",
      category: pin.category && current.category === "other" ? pin.category : current.category,
      icon: pin.category && current.category === "other" ? categoryById(pin.category).icon : current.icon
    }));
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function changeCategory(categoryId) {
    const previousDefault = categoryById(form.category).icon;
    setForm((current) => ({
      ...current,
      category: categoryId,
      // Keep a custom icon; only follow the category when the icon was its default.
      icon: current.icon === previousDefault ? categoryById(categoryId).icon : current.icon
    }));
  }

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    const room = MAX_PHOTOS_PER_PIN - photos.length - uploads.length;
    if (files.length > room) setError(`写真は1つのピンに${MAX_PHOTOS_PER_PIN}枚までです。`);
    for (const file of files.slice(0, Math.max(room, 0))) {
      const uploadId = crypto.randomUUID();
      setUploads((current) => [...current, { id: uploadId, name: file.name, progress: 0 }]);
      try {
        const photo = await uploadPhoto(mapId, pinId, file, user, (progress) => {
          setUploads((current) => current.map((item) => (item.id === uploadId ? { ...item, progress } : item)));
        });
        uploadedHereRef.current.push(photo);
        setPhotos((current) => [...current, photo]);
      } catch (uploadError) {
        console.error(uploadError);
        setError("写真をアップロードできませんでした。");
      } finally {
        setUploads((current) => current.filter((item) => item.id !== uploadId));
      }
    }
  }

  function removePhoto(photo) {
    setPhotos((current) => current.filter((item) => item.id !== photo.id));
    setRemovedPhotos((current) => [...current, photo]);
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("場所名を入力してください。");
      return;
    }
    const videoLinks = form.videoLinks.split(/\s+/).map((link) => link.trim()).filter(Boolean);
    if (videoLinks.some((link) => !/^https?:\/\//.test(link))) {
      setError("動画リンクは https:// から始まるURLを入力してください。");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await savePin(mapId, pinId, {
        title: form.title.trim(),
        address: form.address.trim(),
        lat: pin.lat,
        lng: pin.lng,
        placeId: pin.placeId || "",
        type: form.type,
        category: form.category,
        icon: form.icon,
        visitedAt: form.visitedAt,
        memo: form.memo.trim(),
        photos,
        videoLinks
      }, user, isNew);
      removedPhotos.forEach(deletePhotoFiles);
      onSaved(pinId);
    } catch (saveError) {
      console.error(saveError);
      setError("保存できませんでした。通信状況を確認してください。");
      setSaving(false);
    }
  }

  function handleCancel() {
    uploadedHereRef.current.forEach(deletePhotoFiles);
    onCancel();
  }

  return (
    <form className="pin-editor" onSubmit={handleSave}>
      <h2>{isNew ? "新しいピン" : "ピンを編集"}</h2>

      <div className="segmented" role="radiogroup" aria-label="種別">
        {Object.entries(PIN_TYPES).map(([type, { label }]) => (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={form.type === type}
            className={form.type === type ? `active seg-${type}` : ""}
            onClick={() => update("type", type)}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="field">
        <span>場所名</span>
        <input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder={loadingAddress ? "住所を取得中..." : "場所名"} maxLength={100} />
      </label>

      <label className="field">
        <span>住所</span>
        <input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder={loadingAddress ? "住所を取得中..." : "住所"} maxLength={200} />
      </label>

      <div className="field-row">
        <label className="field">
          <span>カテゴリ</span>
          <select value={form.category} onChange={(event) => changeCategory(event.target.value)}>
            {CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>{category.icon} {category.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>訪れた日</span>
          <input type="date" value={form.visitedAt} onChange={(event) => update("visitedAt", event.target.value)} />
        </label>
      </div>

      <div className="field">
        <span>ピンのアイコン</span>
        <div className="icon-picker">
          {ICON_CHOICES.map((icon) => (
            <button key={icon} type="button" className={form.icon === icon ? "active" : ""} onClick={() => update("icon", icon)} aria-label={`アイコン ${icon}`}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>メモ</span>
        <textarea rows={4} value={form.memo} onChange={(event) => update("memo", event.target.value)} maxLength={2000} placeholder="ふたりの思い出を残そう" />
      </label>

      <div className="field">
        <span>写真（{photos.length}/{MAX_PHOTOS_PER_PIN}）</span>
        <div className="photo-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="photo-grid-item">
              <PhotoImage className="photo-thumb" path={photo.thumbPath} />
              <button type="button" className="photo-remove" aria-label="写真を外す" onClick={() => removePhoto(photo)}>×</button>
            </div>
          ))}
          {uploads.map((item) => (
            <div key={item.id} className="photo-grid-item uploading">
              <span>{Math.round(item.progress * 100)}%</span>
            </div>
          ))}
          {photos.length + uploads.length < MAX_PHOTOS_PER_PIN && (
            <button type="button" className="photo-add" onClick={() => fileInputRef.current?.click()}>＋</button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
      </div>

      <label className="field">
        <span>動画リンク（Googleドライブ等・改行区切り）</span>
        <textarea rows={2} value={form.videoLinks} onChange={(event) => update("videoLinks", event.target.value)} placeholder="https://drive.google.com/..." />
      </label>

      {error && <p className="error-text" role="alert">{error}</p>}

      <div className="sheet-actions">
        <button className="primary-button" type="submit" disabled={saving || uploads.length > 0}>
          {saving ? "保存中..." : "保存"}
        </button>
        <button className="secondary-button" type="button" onClick={handleCancel}>キャンセル</button>
      </div>
    </form>
  );
}
