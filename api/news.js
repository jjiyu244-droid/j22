export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const url = "https://api.coingecko.com/api/v3/news";
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API returned ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("News API error:", err);
    res.status(500).json({ error: "Failed to fetch news", message: err.message });
  }
}

