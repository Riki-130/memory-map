import { useState } from "react";
import { updateCategories } from "../../firebase/maps.js";
import { DEFAULT_CATEGORIES, ICON_PALETTE, pinIcon } from "../pins/categories.js";

const MAX_CATEGORIES = 40;
const MAX_LABEL = 20;

// Edits the map's category list. A category *is* its icon: pins keep their icon,
// so renaming updates every pin's label, and removing one leaves its pins as "カテゴリなし".
export default function CategoryEditor({ map, categories, pins }) {
  const [rows, setRows] = useState(null); // null = not editing
  const [pickerFor, setPickerFor] = useState(null); // row index whose icon is being chosen
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const usage = pins.reduce((counts, pin) => {
    const icon = pinIcon(pin);
    counts[icon] = (counts[icon] || 0) + 1;
    return counts;
  }, {});

  function startEditing() {
    setRows(categories.map((category) => ({ ...category })));
    setStatus("");
  }

  function updateRow(index, patch) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const used = new Set(rows.map((row) => row.icon));
    const icon = ICON_PALETTE.find((candidate) => !used.has(candidate));
    if (!icon) return;
    setRows([...rows, { icon, label: "" }]);
    setPickerFor(rows.length);
  }

  function removeRow(index) {
    const row = rows[index];
    const count = usage[row.icon] || 0;
    if (count > 0 && !confirm(`${row.icon} のピンが${count}件あります。削除すると、それらは「カテゴリなし」になります（アイコンはそのまま）。削除しますか？`)) {
      return;
    }
    setRows(rows.filter((_, rowIndex) => rowIndex !== index));
    setPickerFor(null);
  }

  function moveRow(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    setPickerFor(null);
  }

  async function save() {
    if (rows.some((row) => !row.label.trim())) {
      setStatus("名前が空のカテゴリがあります。");
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      await updateCategories(map.id, rows);
      setRows(null);
      setPickerFor(null);
      setStatus("保存しました");
    } catch (error) {
      console.error(error);
      setStatus("保存できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  if (!rows) {
    return (
      <section className="category-editor">
        <div className="section-heading">
          <h3>カテゴリ（{categories.length}）</h3>
          <button className="text-button" type="button" onClick={startEditing}>編集</button>
        </div>
        <div className="category-summary">
          {categories.map((category) => (
            <span key={category.icon} className="chip">{category.icon} {category.label}</span>
          ))}
        </div>
        {status && <p className="status-text">{status}</p>}
      </section>
    );
  }

  const usedIcons = new Set(rows.map((row) => row.icon));

  return (
    <section className="category-editor">
      <div className="section-heading">
        <h3>カテゴリを編集</h3>
      </div>
      <ul className="category-rows">
        {rows.map((row, index) => (
          <li key={`${row.icon}-${index}`}>
            <div className="category-row">
              <button
                type="button"
                className={`category-icon-button${pickerFor === index ? " active" : ""}`}
                aria-label="アイコンを変更"
                onClick={() => setPickerFor(pickerFor === index ? null : index)}
              >
                {row.icon}
              </button>
              <input
                value={row.label}
                maxLength={MAX_LABEL}
                placeholder="カテゴリ名"
                onChange={(event) => updateRow(index, { label: event.target.value })}
              />
              <span className="category-usage">{usage[row.icon] ? `${usage[row.icon]}件` : ""}</span>
              <button type="button" className="icon-button row-move" aria-label="上へ" onClick={() => moveRow(index, -1)}>↑</button>
              <button type="button" className="icon-button row-remove" aria-label="削除" onClick={() => removeRow(index)}>×</button>
            </div>
            {pickerFor === index && (
              <div className="icon-palette">
                {ICON_PALETTE.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    disabled={icon !== row.icon && usedIcons.has(icon)}
                    className={icon === row.icon ? "active" : ""}
                    onClick={() => {
                      updateRow(index, { icon });
                      setPickerFor(null);
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      {rows.length < MAX_CATEGORIES && (
        <button className="text-button" type="button" onClick={addRow}>＋ カテゴリを追加</button>
      )}
      <small className="hint">
        アイコンを変えると、変更前のアイコンのピンは「カテゴリなし」になります。名前の変更は、すべてのピンに反映されます。
      </small>
      {status && <p className="error-text">{status}</p>}
      <div className="sheet-actions">
        <button className="primary-button" type="button" onClick={save} disabled={saving}>{saving ? "保存中..." : "保存"}</button>
        <button className="secondary-button" type="button" onClick={() => { setRows(null); setPickerFor(null); setStatus(""); }}>キャンセル</button>
      </div>
      <button
        className="text-button reset-button"
        type="button"
        onClick={() => setRows(DEFAULT_CATEGORIES.map(({ icon, label }) => ({ icon, label })))}
      >
        初期のカテゴリに戻す
      </button>
    </section>
  );
}
