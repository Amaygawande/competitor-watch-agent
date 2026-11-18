// All backend calls live here
import axios from "axios";

// Local: empty (Vite proxy handles /api). Vercel: set VITE_API_URL to your backend URL
const BASE = import.meta.env.VITE_API_URL || "";

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
