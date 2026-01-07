import axios from "axios";

/**
 * Get today's date in YYYYMMDD (IST)
 */
function getTodayDateIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);

  const yyyy = ist.getUTCFullYear();
  const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(ist.getUTCDate()).padStart(2, "0");

  return `${yyyy}${mm}${dd}`;
}

export async function fetchBseAnnouncements({
  page = 1,
  fromDate,
  toDate,
  type = "C", // C = Corporate
  search = "P"
} = {}) {
  const url =
    "https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w";

  const today = getTodayDateIST();

  const res = await axios.get(url, {
    params: {
      pageno: page,
      strCat: -1,
      strPrevDate: fromDate || today,
      strToDate: toDate || today,
      strScrip: "",
      strSearch: search,
      strType: type,
      subcategory: -1
    },
    headers: {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "pragma": "no-cache",
      "origin": "https://www.bseindia.com",
      "referer": "https://www.bseindia.com/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    },
    timeout: 15000,
    responseType: "text" // IMPORTANT
  });

  // 🔴 BSE sometimes returns HTML instead of JSON
  if (
    typeof res.data === "string" &&
    (res.data.startsWith("<!DOCTYPE") ||
      res.data.includes("<html"))
  ) {
    throw new Error(
      "BSE blocked request (HTML response received)"
    );
  }

  const json =
    typeof res.data === "string" ? JSON.parse(res.data) : res.data;

  return json?.Table || [];
}
