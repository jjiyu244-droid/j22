export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // CoinGecko News API - 올바른 엔드포인트 사용
    // page 파라미터 없이 기본 요청
    const url = "https://api.coingecko.com/api/v3/news?x_cg_demo_api_key=CG-demo";
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("CoinGecko API Error:", response.status, errorText);
      throw new Error(`CoinGecko API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // 응답 데이터 검증
    if (!data) {
      throw new Error("Empty response from CoinGecko API");
    }
    
    // data 필드가 없을 수도 있으므로 유연하게 처리
    if (data.data && Array.isArray(data.data)) {
      res.status(200).json(data);
    } else if (Array.isArray(data)) {
      // 배열로 직접 반환되는 경우
      res.status(200).json({ data: data });
    } else {
      throw new Error("Invalid response format from CoinGecko API");
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

