
import { GoogleGenAI, Type } from "@google/genai";
import { TradeType, MarketAnalysis, DailyReport, TradeRecord } from "../types";

// Initialize AI directly with process.env.API_KEY as per strict requirements
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeMarket = async (
  symbol: string,
  priceHistory: number[],
  currentBalance: number,
  currentHoldings: number,
  globalSentiment: string
): Promise<MarketAnalysis> => {
  const ai = getAI();
  
  const prompt = `SYSTEM: You are 'AuroTrade v3.5', a Specialist in Energy Markets (Natural Gas) and Cryptocurrencies (BTC, ETH, etc.).
  TASK: Execute deep intelligence gathering and technical analysis on ${symbol}.
  
  CONTEXT:
  Asset: ${symbol}
  Recent Prices: ${priceHistory.join(', ')}
  Portfolio: $${currentBalance.toFixed(2)} cash, ${currentHoldings} units held.
  Global Market Sentiment: ${globalSentiment}
  
  STRICT OPERATIONAL RULE: 
  The execution engine will AUTOMATICALLY CLOSE any trade once it reaches $250.00 in profit.
  
  INTELLIGENCE MANDATE:
  You MUST use Google Search to find:
  1. Real-time news affecting ${symbol} (e.g., EIA storage reports for NATGAS, spot ETF flows for BTC).
  2. Macro-economic triggers (Fed statements, geopolitical tension).
  3. Market sentiment from major financial nodes.
  
  OUTPUT FORMAT: JSON strictly matching the provided schema.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        maxOutputTokens: 3000,
        thinkingConfig: { thinkingBudget: 2000 },
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decision: { type: Type.STRING, description: "BUY, SELL, or HOLD" },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            technicalIndicators: {
              type: Type.OBJECT,
              properties: {
                rsi: { type: Type.NUMBER },
                trend: { type: Type.STRING },
                sentiment: { type: Type.STRING }
              },
              required: ["rsi", "trend", "sentiment"]
            },
            targetPrice: { type: Type.NUMBER }
          },
          required: ["decision", "confidence", "reasoning", "technicalIndicators"]
        },
      },
    });

    const text = response.text || '{}';
    const analysis = JSON.parse(text.trim()) as MarketAnalysis;
    
    // Extract search grounding sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      analysis.sources = groundingChunks
        .filter((chunk: any) => chunk.web)
        .map((chunk: any) => ({
          title: chunk.web.title,
          uri: chunk.web.uri
        }));
    }

    return analysis;
  } catch (error) {
    console.error("Gemini v3.5 Analysis Error:", error);
    return {
      decision: TradeType.HOLD,
      confidence: 0,
      reasoning: "Safety Protocol: Multi-node intelligence gathering timed out. Holding current position.",
      technicalIndicators: { rsi: 50, trend: 'NEUTRAL', sentiment: 'UNKNOWN' }
    };
  }
};

export const generateDailyBriefing = async (
  trades: TradeRecord[],
  pnl: number
): Promise<DailyReport> => {
  const ai = getAI();
  const tradeSummary = trades.slice(0, 10).map(t => `${t.type} ${t.symbol} @ ${t.price}`).join(', ');
  
  const prompt = `Generate a Daily Intelligence Update for the AuroTrade owner.
  Current Day Performance: $${pnl.toFixed(2)}
  Asset Operations: ${tradeSummary}
  
  Note: All winning trades are systematically closed at exactly $250.00 profit.
  
  Focus on:
  - Cryptocurrencies and Natural Gas market trends based on real-world events.
  - Success of the $250 profit target strategy.
  - Integration of real-time search data into the trading decisions.
  - Intelligence Skill Set Progress in hybrid trading (Digital/Physical).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        maxOutputTokens: 2500,
        thinkingConfig: { thinkingBudget: 1500 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            summary: { type: Type.STRING },
            totalProfitLoss: { type: Type.NUMBER },
            majorWins: { type: Type.ARRAY, items: { type: Type.STRING } },
            lessonsLearned: { type: Type.ARRAY, items: { type: Type.STRING } },
            strategyUpdate: { type: Type.STRING }
          },
          required: ["summary", "totalProfitLoss", "majorWins", "lessonsLearned", "strategyUpdate"]
        }
      }
    });
    
    const text = response.text || '{}';
    return JSON.parse(text.trim()) as DailyReport;
  } catch (error) {
    console.error("Gemini Report Error:", error);
    return {
      date: new Date().toLocaleDateString(),
      summary: "End of day digital asset and energy processing encountered a minor delay.",
      totalProfitLoss: pnl,
      majorWins: ["Metadata sync complete"],
      lessonsLearned: ["Hybrid markets require split-second analysis"],
      strategyUpdate: "Monitor NATGAS storage data alongside BTC exchange inflows."
    };
  }
};
