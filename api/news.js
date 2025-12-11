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
    
    // User-Agent 헤더 추가 (일부 API가 요구)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CoinGecko API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // 응답 데이터 검증
    if (!data || !data.data) {
      throw new Error("Invalid response format from CoinGecko API");
    }
    
    res.status(200).json(data);
  } catch (err) {
    console.error("News API error:", err);
    res.status(500).json({ 
      error: "Failed to fetch news", 
      message: err.message,
      details: err.toString()
    });
  }
}

