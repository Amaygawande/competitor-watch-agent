// Box where the user adds company names as small tags
import { useState } from "react";

const EXAMPLE = ["OpenAI", "Anthropic", "Google Gemini", "Mistral", "Perplexity"];

export default function SearchBox({ onRun, loading }) {
  const [names, setNames] = useState([]); // added companies
  const [text, setText] = useState(""); // what the user is typing

  // Add the typed name(s) to the list (max 10, no duplicates)
  function addName() {
    const newNames = text.split(",").map((n) => n.trim()).filter(Boolean);
    const all = [...names];
    for (const n of newNames) {
      if (all.length < 10 && !all.includes(n)) all.push(n);
    }
    setNames(all);
    setText("");
  }

  // Press Enter or comma to add a name
  function handleKey(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addName();
    }
  }

  // Remove one name
  function removeName(name) {
    setNames(names.filter((n) => n !== name));
  }

  return (
    <div className="box">
      <label className="label">Companies or products ({names.length}/10)</label>

      <div className="tags">
        {names.map((n) => (
          <span className="tag" key={n}>
            {n} <button onClick={() => removeName(n)}>×</button>
          </span>
        ))}
        {names.length === 0 && <span className="hint">No companies added yet</span>}
      </div>

      <div className="row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a name and press Enter"
          disabled={names.length >= 10}
        />
        <button className="btn light" onClick={addName}>Add</button>
      </div>

      <div className="row">
        <button className="btn main" onClick={() => onRun(names)} disabled={loading || names.length === 0}>
          {loading ? "Working..." : "🔍 Run Watch"}
        </button>
        <button className="btn link" onClick={() => setNames(EXAMPLE)}>Use example</button>
        {names.length > 0 && <button className="btn link" onClick={() => setNames([])}>Clear</button>}
      </div>
    </div>
  );
}
