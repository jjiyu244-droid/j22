export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 가격 데이터 가져오기
    const priceUrl = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano,polkadot,avalanche-2,polygon,chainlink,uniswap,cosmos&vs_currencies=usd&include_24hr_change=true";
    
    // 이미지 데이터 가져오기
    const imageUrl = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,polkadot,avalanche-2,polygon,chainlink,uniswap,cosmos&order=market_cap_desc&per_page=10&page=1&sparkline=false";

    const [priceRes, imageRes] = await Promise.all([
      fetch(priceUrl),
      fetch(imageUrl)
    ]);

    if (!priceRes.ok || !imageRes.ok) {
      throw new Error("Failed to fetch from CoinGecko API");
    }

    const priceData = await priceRes.json();
    const imageData = await imageRes.json();

    // 이미지 데이터를 id로 매핑
    const imageMap = {};
    imageData.forEach(coin => {
      imageMap[coin.id] = coin.image;
    });

    // 두 데이터를 결합하여 반환
    res.status(200).json({
      prices: priceData,
      images: imageMap
    });
  } catch (err) {
    console.error("Price API error:", err);
    res.status(500).json({ error: "Failed to fetch prices", message: err.message });
  }
}

