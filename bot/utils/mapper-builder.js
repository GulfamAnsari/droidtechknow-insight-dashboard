import axios from "axios";
import csv from "csv-parser";
import fs from "fs";
import unzipper from "unzipper";

const NSE_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv";
const BSE_ZIP = "https://www.bseindia.com/download/BhavCopy/Equity/EQ_ISINCODE_20260107.zip";

export async function buildBseNseMap() {
  const nseMap = {}; // ISIN → NSE SYMBOL
  const bseMap = {}; // BSE → ISIN

  /* ---- NSE MASTER ---- */
  const nseRes = await axios.get(NSE_URL, { responseType: "stream" });

  await new Promise((resolve) => {
    nseRes.data
      .pipe(csv())
      .on("data", (row) => {
        if (row.ISIN && row.SYMBOL) {
          nseMap[row.ISIN.trim()] = row.SYMBOL.trim();
        }
      })
      .on("end", resolve);
  });

  /* ---- BSE MASTER ---- */
  const zip = await axios.get(BSE_ZIP, { responseType: "arraybuffer" });

  await unzipper.Open.buffer(zip.data).then(async (d) => {
    for (const f of d.files) {
      if (f.path.endsWith(".CSV")) {
        await new Promise((resolve) => {
          f.stream()
            .pipe(csv())
            .on("data", (row) => {
              if (row["ISIN No"] && row["Security Code"]) {
                bseMap[row["Security Code"]] = row["ISIN No"].trim();
              }
            })
            .on("end", resolve);
        });
      }
    }
  });

  /* ---- MERGE ---- */
  const finalMap = {};
  for (const bseCode in bseMap) {
    const isin = bseMap[bseCode];
    if (nseMap[isin]) {
      finalMap[bseCode] = {
        isin,
        nse: nseMap[isin]
      };
    }
  }

  fs.writeFileSync(
    "./bse-nse-map.json",
    JSON.stringify(finalMap, null, 2)
  );

  console.log("Mapping built:", Object.keys(finalMap).length);
}

buildBseNseMap();