// AI Competitor Watch Agent - backend (Express + MongoDB + Google Gemini free API)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");
const Parser = require("rss-parser");

const app = express();
app.use(cors());
app.use(express.json());

// Test route: opening the Render URL shows this message
app.get("/", (req, res) => res.send("Competitor Watch API is running ✅"));

const parser = new Parser({ customFields: { item: ["source"] } });

// Models to try in order: main model first, then a lighter backup
const MODELS = [
  process.env.GEMINI_MODEL || "gemini-2.5-flash",
  process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash-lite",
];

// ---------- Database ----------
const reportSchema = new mongoose.Schema({
  companies: [String],
  updates: [
    {
      company: String,
      title: String,
      link: String,
      source: String,
      publishedAt: String,
      category: String,
      summary: String,
      importance: Number,
    },
  ],
  brief: String,
  createdAt: { type: Date, default: Date.now },
});
const Report = mongoose.model("Report", reportSchema);

// ---------- Helper: wait for some milliseconds ----------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- Helper: ask Gemini (free API), retry when it is busy ----------
async function askAI(prompt, maxTokens, wantJson) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      thinkingConfig: { thinkingBudget: 0 }, // no hidden thinking, so the JSON is not cut short
    },
  };
  if (wantJson) body.generationConfig.responseMimeType = "application/json";

  for (const model of MODELS) {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      model +
      ":generateContent";

    // Try each model up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await axios.post(url, body, {
          headers: { "x-goog-api-key": process.env.GEMINI_API_KEY },
          timeout: 90000,
        });
        const parts = res.data.candidates?.[0]?.content?.parts || [];
        return parts.map((p) => p.text || "").join("");
      } catch (err) {
        const status = err.response?.status;
        const msg = err.response?.data?.error?.message || err.message;

        // Busy / limit / network errors are temporary -> wait and retry
        const temporary = !status || [429, 500, 503, 504].includes(status);
        if (!temporary) throw new Error("Gemini API error: " + msg);

        console.log(model + " busy (attempt " + attempt + "): " + msg);
        await sleep(attempt * 3000); // wait 3s, 6s, 9s
      }
    }
  }
  throw new Error(
    "Gemini is very busy right now. Please try again in a minute.",
  );
}

// ---------- Step 1: fetch last 7 days of news for one company ----------
async function fetchUpdates(company) {
  try {
    const url =
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent(company + " when:7d") +
      "&hl=en-US&gl=US&ceid=US:en";
    const res = await axios.get(url, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const feed = await parser.parseString(res.data);

    return feed.items.slice(0, 10).map((item) => {
      const fullTitle = item.title || "";
      // Google News titles look like "Headline - Source Name"
      const parts = fullTitle.split(" - ");
      const sourceFromTitle = parts.length > 1 ? parts.pop() : "";
      const src =
        typeof item.source === "string"
          ? item.source
          : item.source && item.source._;
      return {
        company,
        title: parts.join(" - ") || fullTitle,
        link: item.link || "",
        source: src || sourceFromTitle || "Unknown",
        publishedAt: item.pubDate || "",
        snippet: item.contentSnippet || "",
      };
    });
  } catch (err) {
    console.log("Could not fetch " + company + ": " + err.message);
    return []; // skip this company and continue
  }
}

// ---------- Step 2: remove duplicate links and near-duplicate titles ----------
function removeDuplicates(items) {
  const clean = (t) =>
    new Set(
      t
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(Boolean),
    );

  // Jaccard similarity = shared words / total unique words
  const similarity = (a, b) => {
    const shared = [...a].filter((w) => b.has(w)).length;
    const total = new Set([...a, ...b]).size;
    return total === 0 ? 0 : shared / total;
  };

  const sorted = [...items].sort(
    (a, b) => new Date(a.publishedAt) - new Date(b.publishedAt),
  ); // earliest first, so the earliest copy is kept
  const seenLinks = new Set();
  const kept = [];

  for (const item of sorted) {
    if (seenLinks.has(item.link)) continue;
    const words = clean(item.title);
    const isNearDuplicate = kept.some((k) => similarity(words, k.words) > 0.7);
    if (isNearDuplicate) continue;
    seenLinks.add(item.link);
    kept.push({ ...item, words });
  }
  return kept.map(({ words, ...rest }) => rest); // drop helper field
}

// ---------- Step 3: AI marks noise, categorizes, summarizes, scores ----------
async function analyzeWithAI(items) {
  const list = items
    .map(
      (it, i) =>
        `${i}. [${it.company}] ${it.title} (${it.source}) - ${it.snippet}`,
    )
    .join("\n");

  const prompt = `You are a competitive intelligence analyst. Review these news items.
Return ONLY a valid JSON array (no markdown, no extra text). For every item return:
{"index": number, "relevant": true/false, "category": "Product"|"Pricing"|"Hiring"|"Partnership"|"Funding"|"Other", "summary": "one sentence", "importance": 1-5}
Set "relevant" to false for noise: stock price chatter, generic listicles, ads, opinion fluff, or articles that only loosely mention the company.

Items:
${list}`;

  const text = await askAI(prompt, 8192, true);
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    const result = JSON.parse(cleaned);
    if (!Array.isArray(result)) throw new Error("not an array");
    return result;
  } catch (err) {
    console.log("AI returned invalid JSON:", cleaned.slice(0, 200));
    throw new Error("AI response could not be parsed. Please try again.");
  }
}

// ---------- Step 4: AI writes the intelligence brief ----------
async function generateBrief(updates) {
  if (updates.length === 0)
    return "No meaningful updates found in the last 7 days.";
  const list = updates
    .map(
      (u) =>
        `- [${u.company}] (${u.category}, importance ${u.importance}) ${u.summary}`,
    )
    .join("\n");

  const prompt = `Write a concise competitive intelligence brief (max 200 words) from these updates.
Format: a short executive summary, then 3-5 key takeaways grouped by company, each with a "So what:" line.
Use simple markdown.

Updates:
${list}`;
  return askAI(prompt, 2048, false);
}

// ---------- Route: run the full pipeline ----------
app.post("/api/watch", async (req, res) => {
  try {
    const companies = (req.body.companies || [])
      .map((c) => String(c).trim())
      .filter(Boolean);
    if (companies.length < 1 || companies.length > 10) {
      return res
        .status(400)
        .json({ error: "Please enter 1 to 10 company names." });
    }

    // 1. fetch all companies in parallel
    const results = await Promise.all(companies.map(fetchUpdates));
    const allItems = results.flat();
    if (allItems.length === 0) {
      return res
        .status(404)
        .json({ error: "No recent news found for these companies." });
    }

    // 2. remove duplicates
    const unique = removeDuplicates(allItems);

    // 3. AI analysis, then keep only relevant items
    const analysis = await analyzeWithAI(unique);
    const updates = [];
    for (const a of analysis) {
      const item = unique[a.index];
      if (!item || !a.relevant) continue;
      updates.push({
        company: item.company,
        title: item.title,
        link: item.link,
        source: item.source,
        publishedAt: item.publishedAt,
        category: a.category || "Other",
        summary: a.summary || item.title,
        importance: a.importance || 1,
      });
    }
    updates.sort((a, b) => b.importance - a.importance);

    // 4. brief
    const brief = await generateBrief(updates);

    // 5. save only if there is real data (if the database is down, still return the result)
    const data = { companies, updates, brief, createdAt: new Date() };
    if (updates.length > 0) {
      try {
        await Report.create(data);
      } catch (dbErr) {
        console.log("Could not save report:", dbErr.message);
      }
    }
    res.json(data);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message || "Something went wrong." });
  }
});

// ---------- Route: last 5 saved reports that have data ----------
app.get("/api/reports", async (req, res) => {
  try {
    const reports = await Report.find({
      "companies.0": { $exists: true },
      "updates.0": { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(5);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Start ----------
const PORT = process.env.PORT || 5000;
mongoose
  .connect(
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/competitor-watch",
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection failed:", err.message));
app.listen(PORT, () =>
  console.log("Server running on http://localhost:" + PORT),
);
