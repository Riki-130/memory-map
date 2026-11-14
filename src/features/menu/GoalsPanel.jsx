import { useEffect, useState } from "react";
import { addGoal, deleteGoal, setGoalDone, subscribeGoals, updateGoal, updateGoals } from "../../firebase/goals.js";

// Goals use calendar years. Nothing before the app's first year is ever shown.
const FIRST_YEAR = 2026;
const YEARS_AHEAD = 5;
const MAX_TEXT = 100;
const MAX_YEN = 1_000_000_000_000; // same limit as firestore.rules

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

export default function GoalsPanel({ map, user, pins, onGoToPin }) {
  const currentYear = Math.max(new Date().getFullYear(), FIRST_YEAR);
  const [goals, setGoals] = useState(null); // null = loading
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("");
  const [openYears, setOpenYears] = useState(() => new Set([currentYear]));
  const [pastOpen, setPastOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [reorderYear, setReorderYear] = useState(null);
  const [celebration, setCelebration] = useState(null); // { key, year }

  useEffect(() => {
    return subscribeGoals(
      map.id,
      (next) => {
        setLoadError("");
        setGoals(next);
      },
      (error) => {
        console.warn("Goal listener failed", error);
        setLoadError("目標を読み込めませんでした。通信状況を確認してください。");
      }
    );
  }, [map.id]);

  useEffect(() => {
    if (!celebration) return undefined;
    const timer = setTimeout(() => setCelebration(null), 2800);
    return () => clearTimeout(timer);
  }, [celebration]);

  if (loadError) return <p className="error-text">{loadError}</p>;
  if (!goals) return <p className="empty">読み込み中…</p>;

  const goalsByYear = new Map();
  for (const goal of goals) {
    if (!goalsByYear.has(goal.year)) goalsByYear.set(goal.year, []);
    goalsByYear.get(goal.year).push(goal);
  }
  for (const list of goalsByYear.values()) list.sort(byOrder);

  const upcomingYears = Array.from({ length: YEARS_AHEAD + 1 }, (_, index) => currentYear + index);
  const pastYears = [...goalsByYear.keys()]
    .filter((year) => year >= FIRST_YEAR && year < currentYear)
    .sort((a, b) => b - a);
  const lastYear = currentYear + YEARS_AHEAD;
  // Goals can be moved to any shown year (plus the year they already belong to).
  const selectableYears = [...pastYears].reverse().concat(upcomingYears);

  function run(promise) {
    setStatus("");
    promise.catch((error) => {
      console.error(error);
      setStatus("保存できませんでした。通信状況を確認してください。");
    });
  }

  function toggleYear(year) {
    setOpenYears((current) => {
      const next = new Set(current);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  function toggleDone(goal) {
    const done = !goal.done;
    const siblings = goalsByYear.get(goal.year) || [];
    if (done && siblings.every((item) => item.id === goal.id || item.done)) setCelebration({ key: Date.now(), year: goal.year });
    run(setGoalDone(map.id, goal.id, done, user));
  }

  function add(year, text) {
    run(addGoal(map.id, year, text, Date.now(), user));
  }

  function save(goal, patch) {
    if (patch.year !== goal.year) patch.order = Date.now(); // goes to the end of its new year
    setEditingId(null);
    run(updateGoal(map.id, goal.id, patch));
  }

  function remove(goal) {
    if (!confirm(`「${goal.text}」を削除しますか？`)) return;
    setEditingId(null);
    run(deleteGoal(map.id, goal.id));
  }

  function move(year, index, direction) {
    const list = goalsByYear.get(year) || [];
    const a = list[index];
    const b = list[index + direction];
    if (!a || !b) return;
    // Equal orders (should not happen) would make the swap a no-op, so fall back to positions.
    const [orderA, orderB] = a.order === b.order ? [index + direction, index] : [b.order, a.order];
    run(updateGoals(map.id, { [a.id]: { order: orderA }, [b.id]: { order: orderB } }));
  }

  function carryOver(year) {
    const pending = (goalsByYear.get(year) || []).filter((goal) => !goal.done);
    if (!pending.length) return;
    if (!confirm(`${year}年の未達成の目標${pending.length}件を${currentYear}年へ移しますか？`)) return;
    const base = Date.now();
    run(updateGoals(map.id, Object.fromEntries(pending.map((goal, index) => [goal.id, { year: currentYear, order: base + index }]))));
    setOpenYears((current) => new Set(current).add(currentYear));
  }

  const sectionProps = (year, isPast) => ({
    year,
    isPast,
    currentYear,
    goals: goalsByYear.get(year) || [],
    open: openYears.has(year),
    reordering: reorderYear === year && (goalsByYear.get(year) || []).length > 1,
    editingId,
    map,
    pins,
    selectableYears,
    onToggle: () => toggleYear(year),
    onToggleDone: toggleDone,
    onEdit: setEditingId,
    onSave: save,
    onDelete: remove,
    onAdd: (text) => add(year, text),
    onMove: (index, direction) => move(year, index, direction),
    onToggleReorder: () => setReorderYear(reorderYear === year ? null : year),
    onCarryOver: () => carryOver(year),
    onGoToPin
  });

  return (
    <div className="goals-panel">
      <p className="goals-intro">{currentYear}年〜{lastYear}年、ふたりで叶えたいこと</p>
      {status && <p className="error-text goals-status">{status}</p>}

      {upcomingYears.map((year) => <YearSection key={year} {...sectionProps(year, false)} />)}

      {pastYears.length > 0 && (
        <div className="goals-past">
          <button type="button" className="goals-past-toggle" aria-expanded={pastOpen} onClick={() => setPastOpen(!pastOpen)}>
            <Chevron open={pastOpen} /> 過去の年（{pastYears.length}）
          </button>
          {pastOpen && pastYears.map((year) => <YearSection key={year} {...sectionProps(year, true)} />)}
        </div>
      )}

      {celebration && <Confetti key={celebration.key} year={celebration.year} />}
    </div>
  );
}

function YearSection({
  year, isPast, currentYear, goals, open, reordering, editingId, map, pins, selectableYears,
  onToggle, onToggleDone, onEdit, onSave, onDelete, onAdd, onMove, onToggleReorder, onCarryOver, onGoToPin
}) {
  const doneCount = goals.filter((goal) => goal.done).length;
  const complete = goals.length > 0 && doneCount === goals.length;
  const pendingCount = goals.length - doneCount;
  const percent = goals.length ? Math.round((doneCount / goals.length) * 100) : 0;

  return (
    <section className={`goal-year${open ? " open" : ""}${complete ? " complete" : ""}${year === currentYear ? " current" : ""}`}>
      <button type="button" className="goal-year-header" aria-expanded={open} onClick={onToggle}>
        <span className="goal-year-title">
          {year}年 目標{complete && <span className="goal-year-party" aria-label="すべて達成"> 🎉</span>}
        </span>
        <span className="goal-year-count">{goals.length ? `${doneCount}/${goals.length}` : "未設定"}</span>
        <Chevron open={open} />
        <span className="goal-progress" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </span>
      </button>

      {open && (
        <div className="goal-year-body">
          {goals.length === 0 && <p className="goal-empty">まだ目標がありません。下の欄から追加しましょう。</p>}
          <ul className="goal-list">
            {goals.map((goal, index) =>
              editingId === goal.id ? (
                <li key={goal.id} className="goal-item editing">
                  <GoalEditor
                    goal={goal}
                    pins={pins}
                    years={selectableYears.includes(goal.year) ? selectableYears : [goal.year, ...selectableYears]}
                    onSave={(patch) => onSave(goal, patch)}
                    onDelete={() => onDelete(goal)}
                    onCancel={() => onEdit(null)}
                  />
                </li>
              ) : (
                <GoalItem
                  key={goal.id}
                  goal={goal}
                  map={map}
                  pin={goal.pinId ? pins.find((item) => item.id === goal.pinId) : null}
                  reordering={reordering}
                  isFirst={index === 0}
                  isLast={index === goals.length - 1}
                  onToggleDone={() => onToggleDone(goal)}
                  onEdit={() => onEdit(goal.id)}
                  onMove={(direction) => onMove(index, direction)}
                  onGoToPin={onGoToPin}
                />
              )
            )}
          </ul>

          {!reordering && <AddGoalForm onAdd={onAdd} />}

          <div className="goal-year-actions">
            {goals.length > 1 && (
              <button type="button" className="text-button" onClick={onToggleReorder}>
                {reordering ? "並べ替えを終える" : "⇅ 並べ替え"}
              </button>
            )}
            {isPast && pendingCount > 0 && (
              <button type="button" className="text-button" onClick={onCarryOver}>
                未達成の{pendingCount}件を{currentYear}年へ持ち越す ›
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function GoalItem({ goal, map, pin, reordering, isFirst, isLast, onToggleDone, onEdit, onMove, onGoToPin }) {
  const doneDate = goal.done && goal.doneAt?.toDate ? formatDate(goal.doneAt.toDate()) : "";
  const doneByName = goal.done && goal.doneBy ? map.members?.[goal.doneBy]?.displayName : "";
  const hasAmount = goal.amountTarget > 0;
  const amountPercent = hasAmount ? Math.min(100, Math.round(((goal.amountCurrent || 0) / goal.amountTarget) * 100)) : 0;

  return (
    <li className={`goal-item${goal.done ? " done" : ""}`}>
      <div className="goal-row">
        <label className="goal-check">
          <input type="checkbox" checked={!!goal.done} onChange={onToggleDone} disabled={reordering} />
          <span className="goal-box" aria-hidden="true" />
          <span className="goal-text">{goal.text}</span>
        </label>
        {reordering ? (
          <span className="goal-move">
            <button type="button" className="icon-button" aria-label="上へ" disabled={isFirst} onClick={() => onMove(-1)}>↑</button>
            <button type="button" className="icon-button" aria-label="下へ" disabled={isLast} onClick={() => onMove(1)}>↓</button>
          </span>
        ) : (
          <button type="button" className="icon-button goal-edit-button" aria-label="編集" onClick={onEdit}>
            <PencilIcon />
          </button>
        )}
      </div>

      {hasAmount && (
        <div className="goal-amount">
          <span className="goal-amount-bar" aria-hidden="true"><span style={{ width: `${amountPercent}%` }} /></span>
          <span className="goal-amount-text">
            {formatYen(goal.amountCurrent || 0)} / {formatYen(goal.amountTarget)}（{amountPercent}%）
          </span>
        </div>
      )}

      {(doneDate || pin) && (
        <div className="goal-meta">
          {doneDate && <span>{doneDate} 達成{doneByName ? ` · ${doneByName}` : ""}</span>}
          {pin && (
            <button type="button" className="goal-pin-link" onClick={() => onGoToPin(pin.id)}>
              📍 {pin.title}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function AddGoalForm({ onAdd }) {
  const [text, setText] = useState("");

  function submit(event) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    onAdd(value);
    setText("");
  }

  return (
    <form className="goal-add" onSubmit={submit}>
      <input
        value={text}
        maxLength={MAX_TEXT}
        placeholder="＋ 目標を追加"
        enterKeyHint="done"
        onChange={(event) => setText(event.target.value)}
      />
      {text.trim() && <button type="submit" className="primary-button small">追加</button>}
    </form>
  );
}

function GoalEditor({ goal, pins, years, onSave, onDelete, onCancel }) {
  const [text, setText] = useState(goal.text);
  const [year, setYear] = useState(goal.year);
  const [amountTarget, setAmountTarget] = useState(goal.amountTarget ?? "");
  const [amountCurrent, setAmountCurrent] = useState(goal.amountCurrent ?? "");
  const [pinId, setPinId] = useState(goal.pinId || "");
  const [error, setError] = useState("");

  const byTitle = (a, b) => a.title.localeCompare(b.title, "ja");
  const memories = pins.filter((pin) => pin.type === "memory").sort(byTitle);
  const wishes = pins.filter((pin) => pin.type === "wishlist").sort(byTitle);
  const pinMissing = pinId && !pins.some((pin) => pin.id === pinId);

  function submit(event) {
    event.preventDefault();
    const value = text.trim();
    if (!value) {
      setError("目標を入力してください。");
      return;
    }
    const target = parseYen(amountTarget);
    const current = parseYen(amountCurrent);
    if ((target ?? 0) > MAX_YEN || (current ?? 0) > MAX_YEN) {
      setError("金額が大きすぎます。");
      return;
    }
    if (current != null && target == null) {
      setError("今の金額を入れるときは、目標金額も入れてください。");
      return;
    }
    onSave({
      text: value,
      year: Number(year),
      amountTarget: target,
      amountCurrent: target == null ? null : current,
      pinId: pinMissing ? "" : pinId
    });
  }

  return (
    <form className="goal-editor" onSubmit={submit}>
      <label className="field">
        <span>目標</span>
        <input value={text} maxLength={MAX_TEXT} onChange={(event) => setText(event.target.value)} autoFocus />
      </label>
      <label className="field">
        <span>年</span>
        <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
          {years.map((item) => <option key={item} value={item}>{item}年</option>)}
        </select>
      </label>
      <div className="field-row">
        <label className="field">
          <span>目標金額（円）</span>
          <input inputMode="numeric" placeholder="例：500000" value={amountTarget} onChange={(event) => setAmountTarget(event.target.value)} />
        </label>
        <label className="field">
          <span>今の金額（円）</span>
          <input inputMode="numeric" placeholder="例：120000" value={amountCurrent} onChange={(event) => setAmountCurrent(event.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>思い出のピン</span>
        <select value={pinMissing ? "" : pinId} onChange={(event) => setPinId(event.target.value)}>
          <option value="">つなげない</option>
          {memories.length > 0 && (
            <optgroup label="思い出">
              {memories.map((pin) => <option key={pin.id} value={pin.id}>{pin.title}</option>)}
            </optgroup>
          )}
          {wishes.length > 0 && (
            <optgroup label="行ってみたい">
              {wishes.map((pin) => <option key={pin.id} value={pin.id}>{pin.title}</option>)}
            </optgroup>
          )}
        </select>
        <small className="hint">達成した場所のピンをつなげると、目標から地図へ移動できます。</small>
      </label>
      {error && <p className="error-text">{error}</p>}
      <div className="goal-editor-actions">
        <button type="button" className="text-button danger" onClick={onDelete}>削除</button>
        <span className="spacer" />
        <button type="button" className="text-button" onClick={onCancel}>キャンセル</button>
        <button type="submit" className="primary-button small">保存</button>
      </div>
    </form>
  );
}

const CONFETTI_COLORS = ["#197379", "#78bab9", "#b4d7d9", "#f1ebcb", "#d9c77a", "#e88d7a"];

// A short burst shown when the last open goal of a year is checked.
function Confetti({ year }) {
  const [pieces] = useState(() =>
    Array.from({ length: 42 }, (_, index) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.6 + Math.random() * 1.0,
      drift: (Math.random() - 0.5) * 120,
      rotate: Math.random() * 720 - 360,
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      round: index % 3 === 0
    }))
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece, index) => (
        <span
          key={index}
          className={piece.round ? "round" : ""}
          style={{
            left: `${piece.left}%`,
            background: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            "--drift": `${piece.drift}px`,
            "--rotate": `${piece.rotate}deg`
          }}
        />
      ))}
      <p className="confetti-message">🎉 {year}年の目標、ぜんぶ達成！</p>
    </div>
  );
}

function Chevron({ open }) {
  return <span className={`chevron${open ? " open" : ""}`} aria-hidden="true">›</span>;
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function parseYen(value) {
  const digits = String(value).replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

function formatYen(value) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function formatDate(date) {
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}
