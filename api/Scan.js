export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { address, mode } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Vercel में GEMINI_API_KEY सेट नहीं है।' });
    }

    try {
        let prompt = "";

        if (mode === 'wallet') {
            prompt = `You are NexaCore AI ($NXC), an expert crypto Wallet PnL & On-Chain Behavior Analyzer. Analyze this wallet address: ${address}. Give a crisp, structured Wallet Profit/Loss (PnL) & Risk Profile summary in BOTH Hindi and English (3 bullet points each: Trading Style, Risk Score 0-100, and Smart Money Verdict).`;
        } else {
            const dexRes = await fetch(`https://dexscreener.com{address}`);
            const dexData = await dexRes.json();
            const pair = dexData.pairs && dexData.pairs.length > 0 ? dexData.pairs[0] : null;

            if (!pair) {
                return res.status(404).json({ error: 'यह टोकन DexScreener पर नहीं मिला। सही कॉन्ट्रैक्ट एड्रेस जांचें।' });
            }

            const tokenInfo = `
                Token Name: ${pair.baseToken.name} (${pair.baseToken.symbol})
                Chain: ${pair.chainId}
                Price USD: $${pair.priceUsd}
                Liquidity USD: $${pair.liquidity?.usd || 0}
                FDV / Market Cap: $${pair.fdv || 0}
                24h Volume: $${pair.volume?.h24 || 0}
                24h Buys/Sells: ${pair.txns?.h24?.buys || 0} Buys / ${pair.txns?.h24?.sells || 0} Sells
            `;

            prompt = `You are NexaCore AI ($NXC), an expert crypto security auditor. Analyze this live token data and give a short, crisp Security Report in BOTH Hindi and English. Include:
            1. Safety Score (0-100)
            2. Rug-Pull Risk Level (Low/Medium/High) based on Liquidity vs Market Cap
            3. Key Warning or Green Flag in 2 bullet points.
            Data: ${tokenInfo}`;
        }

        const geminiRes = await fetch(`https://googleapis.com{apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const geminiData = await geminiRes.json();
        const report = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "AI रिपोर्ट जनरेट नहीं हो सकी।";

        return res.status(200).json({ report });
    } catch (error) {
        return res.status(500).json({ error: 'स्कैन करते समय तकनीकी त्रुटि आई: ' + error.message });
    }
}
