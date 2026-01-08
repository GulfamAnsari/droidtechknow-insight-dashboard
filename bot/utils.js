

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getISTNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

export function getNextIntervalMs() {
  const now = getISTNow();
  const day = now.getDay(); // 0 Sun, 6 Sat
  const hour = now.getHours();

  const isWeekend = day === 0 || day === 6;

  // Weekends → every 1 hour
  if (isWeekend) {
    return 60 * 60 * 1000;
  }

  // Weekdays
  if (hour >= 7 && hour < 16) {
    return 1 * 30 * 1000; // 1 minute
  }

  if (hour >= 1 && hour < 7) {
    return 2 * 60 * 60 * 1000; // 2 hour
  }

  // Rest (16:00–01:00)
  return 30 * 60 * 1000; // 30 minutes
}

/**
 * Stock Logo Resolver
 * Priority:
 * 1. Groww static logos (fast, reliable)
 * 2. Clearbit (open logo API)
 * 3. Placeholder
 */

/* ================= LOGO PROVIDERS ================= */

function getGrowwLogo(symbol) {
  if (!symbol) return null;
  return `https://assets-netstorage.groww.in/stock-assets/logos2/${symbol.toUpperCase()}.webp`;
}

function getPlaceholderLogo(text = "STOCK") {
  return `https://via.placeholder.com/64?text=${encodeURIComponent(text)}`;
}

/* ================= MAIN RESOLVER ================= */

export function resolveStockLogo({ symbol, companyName }) {
  // 1️⃣ Try Groww (best for Indian stocks)
  if (symbol) {
    return getGrowwLogo(symbol);
  }

  // 3️⃣ Placeholder
  return getPlaceholderLogo(companyName || "STOCK");
}

export function convertToGrowwPost(input) {
  const now = new Date(input.date || Date.now());
  const publishedAt = now.toISOString();
  const expireAt = new Date(
    now.getTime() + 5 * 24 * 60 * 60 * 1000
  ).toISOString(); // +5 days

  const companySlug = (input.companyName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const postId = `${input._id}_${input.companyName}-1-VariationA`;

  return {
    name: postId,
    postId: postId,
    category: null,
    publisher: "Stock News Summary",
    publisherId: "stocknewssummary",
    from: "Kotak",
    publishedAt,
    expireAt,
    campaignType: "GENERIC",
    data: {
      cta: [
        {
          type: "STOCK",
          ctaText: input.companyName,
          ctaUrl: `https://groww.in/stocks/${companySlug}`,
          logoUrl: resolveStockLogo({
            symbol: input.symbol,
            companyName: input.companyName,
          }) || "https://picsum.photos/200/300",
          meta: {
            bseScriptCode: input.cmotCode || null,
            nseScriptCode: input.symbol || null
          }
        }
      ],

      title: input.title,
      body: `${input.description || input.summary}`
    }
  };
}


export function mapBseToNews(bseItem) {
  const publishedAt = new Date(bseItem.DT_TM);
  const companySlug = (bseItem.SLONGNAME || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    name: `${bseItem.NEWSID}_${bseItem.SLONGNAME}`,
    postId: bseItem.NEWSID,
    category: bseItem.CATEGORYNAME || null,
    publisher: "BSE India",
    publisherId: "bseindia",
    publishedAt: publishedAt.toISOString(),
    expireAt: new Date(
      publishedAt.getTime() + 5 * 24 * 60 * 60 * 1000
    ).toISOString(),
    campaignType: "GENERIC",
    from: "BSE INDIA",
    data: {
      cta: [
        {
          type: "STOCK",
          ctaText: bseItem.SLONGNAME,
          ctaUrl: `https://groww.in/stocks/${companySlug}`,
          logoUrl: resolveStockLogo({
            symbol: String(bseItem.SCRIP_CD),
            companyName: bseItem.SLONGNAME,
          }) || "https://droidtechknow.com/admin/api/files/uploads/23/thumbnail/demo.png",
          meta: {
            bseScriptCode: String(bseItem.SCRIP_CD)
          }
        }
      ],

      title: bseItem.HEADLINE || bseItem.NEWSSUB,
      body: `${bseItem.NEWSSUB}\n\nCategory: ${bseItem.CATEGORYNAME}`,
      media: bseItem.ATTACHMENTNAME
        ? [
            {
              type: "PDF",
              url: `https://www.bseindia.com/xml-data/corpfiling/AttachLive/${bseItem.ATTACHMENTNAME}`
            }
          ]
        : [],
      reactions: [
        {
          type: "LIKE",
          count: 0,
          active: true
        }
      ]
    },

    machineLearningSentiments: null // you already enrich later
  };
}

export function getTodayYYYYMMDD() {
  const now = new Date();

  // Convert to IST
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");

  return `${y}${m}${d}`;
}