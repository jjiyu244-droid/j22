export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // CoinGecko News API는 이제 인증이 필요하므로
    // 대안: CryptoCompare News API 사용 (무료, 인증 불필요)
    const url = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN";
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("News API Error:", response.status, errorText);
      throw new Error(`News API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // 응답 데이터 검증
    if (!data) {
      throw new Error("Empty response from News API");
    }
    
    // CryptoCompare 형식을 CoinGecko 형식으로 변환
    if (data.Data && Array.isArray(data.Data)) {
      const convertedData = {
        data: data.Data.slice(0, 10).map(item => ({
          id: item.id || Math.random().toString(),
          title: item.title || "No title",
          url: item.url || "#",
          source: item.source || "Unknown",
          published_at: item.published_on || Math.floor(Date.now() / 1000),
          description: item.body || item.description || ""
        }))
      };
      res.status(200).json(convertedData);
    } else {
      throw new Error("Invalid response format from News API");
    }
  } catch (err) {
    console.error("News API error:", err);
    res.status(500).json({ 
      error: "Failed to fetch news", 
      message: err.message,
      details: err.toString()
    });
  }
}

