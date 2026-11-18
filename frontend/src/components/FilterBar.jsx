// Category buttons with a count on each one
const CATEGORIES = ["All", "Product", "Pricing", "Hiring", "Partnership", "Funding", "Other"];

export default function FilterBar({ updates, filter, onChange }) {
  // How many updates are in a category
  function count(cat) {
    return cat === "All" ? updates.length : updates.filter((u) => u.category === cat).length;
  }

  return (
    <div className="filters">
      {CATEGORIES.map((c) => (
        <button key={c} className={filter === c ? "active" : ""} onClick={() => onChange(c)}>
          {c} <span>{count(c)}</span>
        </button>
      ))}
    </div>
  );
}
