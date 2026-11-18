// Main page: holds the data and puts all the small components together
import { useState, useEffect } from "react";
import { runWatch, getReports } from "./api";
import SearchBox from "./components/SearchBox";
import BriefCard from "./components/BriefCard";
import FilterBar from "./components/FilterBar";
import UpdateCard from "./components/UpdateCard";
import PastReports from "./components/PastReports";

export default function App() {
  const [report, setReport] = useState(null); // report currently shown
  const [past, setPast] = useState([]); // saved reports
  const [filter, setFilter] = useState("All"); // selected category
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load saved reports from the backend
  async function loadPast() {
    try {
      setPast(await getReports());
    } catch (err) {
      console.log("Could not load past reports");
    }
  }

  // Load past reports once when the page opens
  useEffect(() => {
    loadPast();
  }, []);

  // Called when the user clicks "Run Watch"
  async function handleRun(companies) {
    setError("");
    setLoading(true);
    setFilter("All");
    try {
      setReport(await runWatch(companies));
      loadPast();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Could not reach the server. Is the backend running?",
      );
    }
    setLoading(false);
  }

  // Called when the user clicks a past report
  function openReport(r) {
    setReport(r);
    setFilter("All");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Only show updates that match the selected category
  const shown = report
    ? report.updates.filter((u) => filter === "All" || u.category === filter)
    : [];

  return (
    <div>
      <header className="hero">
        <h1>🕵️ Competitor Watch</h1>
        <p>
          Add your competitors. Get this week's important news, sorted and
          summarized.
        </p>
      </header>

      <main className="page">
        <SearchBox onRun={handleRun} loading={loading} />

        {error && <div className="error">⚠️ {error}</div>}

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Finding news, removing duplicates and writing your brief...</p>
            <small>This takes about 30-60 seconds.</small>
          </div>
        )}

        {report && !loading && (
          <>
            <BriefCard brief={report.brief} companies={report.companies} />
            <h2 className="title">Updates ({report.updates.length})</h2>
            <FilterBar
              updates={report.updates}
              filter={filter}
              onChange={setFilter}
            />
            {shown.length === 0 && (
              <p className="empty">No updates in this category.</p>
            )}
            {shown.map((u, i) => (
              <UpdateCard key={i} update={u} />
            ))}
          </>
        )}

        <PastReports reports={past} onOpen={openReport} />
      </main>
    </div>
  );
}
