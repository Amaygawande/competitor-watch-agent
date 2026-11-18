// One news update card
export default function UpdateCard({ update }) {
  const date = update.publishedAt ? new Date(update.publishedAt).toLocaleDateString() : "";
  const stars = "★".repeat(update.importance) + "☆".repeat(5 - update.importance);

  return (
    <div className="card">
      <div className="card-top">
        <strong>{update.company}</strong>
        <span className={"badge " + update.category}>{update.category}</span>
        <span className="stars" title="Importance">{stars}</span>
      </div>
      <p className="summary">{update.summary}</p>
      <div className="card-bottom">
        <small>{update.source} • {date}</small>
        <a href={update.link} target="_blank" rel="noreferrer">Read more →</a>
      </div>
    </div>
  );
}
