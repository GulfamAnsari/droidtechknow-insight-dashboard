import axios from "axios";
import csv from "csv-parser";
import fs from "fs";
import unzipper from "unzipper";

// URLs (update with latest files)
const NSE_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv";
const BSE_URL = "https://www.bseindia.com/download/BhavCopy/Equity/EQ_ISINCODE_20260107.zip"; // BSE ISIN master

async function fetchNseData() {
  console.log("Fetching NSE CSV...");
  const nseMap = {}; // ISIN -> NSE SYMBOL

  const res = await axios.get(NSE_URL, { responseType: "stream" });
  await new Promise((resolve) => {
    res.data
      .pipe(csv())
      .on("data", (row) => {
        if (row[" ISIN NUMBER"] && row["SYMBOL"]) {
          const isin = row[" ISIN NUMBER"].trim();
          const symbol = row["SYMBOL"].trim();
          nseMap[isin] = symbol;
        }
      })
      .on("end", resolve);
  });

  console.log("NSE CSV parsed:", Object.keys(nseMap).length);
  return nseMap;
}

async function fetchBseData() {
  console.log("Fetching BSE ZIP...");
  const bseMap = {}; // SC_CODE -> ISIN

  const res = await axios.get(BSE_URL, { responseType: "arraybuffer" });
  const zip = await unzipper.Open.buffer(res.data);

  for (const file of zip.files) {
    if (file.path.endsWith(".CSV")) {
      await new Promise((resolve) => {
        file.stream()
          .pipe(csv())
          .on("data", (row) => {
            console.log(row)
            if (row["SC_CODE"] && row["ISIN_NO"]) {
              const sc = row["SC_CODE"].trim();
              const isin = row["ISIN_NO"].trim();
              bseMap[sc] = isin;
            }
          })
          .on("end", resolve);
      });
    }
  }

  console.log("BSE CSV parsed:", Object.keys(bseMap).length);
  return bseMap;
}

async function buildBseNseMap() {
  try {
    const nseMap = await fetchNseData();
    const bseMap = await fetchBseData();

    const finalMap = {};

    for (const bseCode in bseMap) {
      const isin = bseMap[bseCode];
      if (nseMap[isin]) {
        finalMap[bseCode] = {
          isin,
          nse: nseMap[isin],
        };
      }
    }

    fs.writeFileSync("./bse-nse-map.json", JSON.stringify(finalMap, null, 2));
    console.log("Mapping built:", Object.keys(finalMap).length);
  } catch (err) {
    console.error("Error building map:", err.message);
  }
}

buildBseNseMap();
