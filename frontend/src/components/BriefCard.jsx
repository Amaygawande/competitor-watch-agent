// Shows the AI intelligence brief

// Turn **text** into bold text
function withBold(line) {
  return line.split("**").map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
}

export default function BriefCard({ brief, companies }) {
  // Remove markdown symbols (#, *, -) at the start of each line
  const lines = (brief || "").split("\n").filter((l) => l.trim() !== "");

  return (
    <div className="brief">
      <h2>📝 Intelligence Brief</h2>
      <small>Companies: {companies.join(", ")}</small>
      {lines.map((line, i) => (
        <p key={i}>{withBold(line.replace(/^#+\s*/, "").replace(/^[*-]\s+/, "• "))}</p>
      ))}
    </div>
  );
}
