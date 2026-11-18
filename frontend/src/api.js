// All backend calls live here
import axios from "axios";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// Run the competitor watch for a list of company names
export async function runWatch(companies) {
  const res = await axios.post(BASE + "/api/watch", { companies });
  return res.data;
}

// Get the last saved reports
export async function getReports() {
  const res = await axios.get(BASE + "/api/reports");
  return res.data;
}