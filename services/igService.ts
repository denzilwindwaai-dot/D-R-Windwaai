
import { IGAccountCredentials, TradeType } from "../types";

/**
 * Service to interact with IG.com (IG Index) REST API.
 * Documentation: https://labs.ig.com/rest-api-reference
 */
class IGService {
  private baseUrl: string = "";
  private sessionTokens: { cst: string; securityToken: string } | null = null;
  private apiKey: string = "";

  setEnvironment(env: 'DEMO' | 'LIVE') {
    this.baseUrl = env === 'DEMO' 
      ? "https://demo-api.ig.com/gateway/deal" 
      : "https://api.ig.com/gateway/deal";
  }

  async connect(creds: IGAccountCredentials): Promise<boolean> {
    this.setEnvironment(creds.environment);
    this.apiKey = creds.apiKey;

    // In a real browser environment, IG API requires a proxy or specific CORS handling.
    // This is a robust mock of the IG authentication flow.
    console.log("Connecting to IG.com...", creds.username);
    
    try {
      // Step 1: POST /session
      // const response = await fetch(`${this.baseUrl}/session`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json; charset=UTF-8',
      //     'Accept': 'application/json; charset=UTF-8',
      //     'X-IG-API-KEY': this.apiKey,
      //     'VERSION': '2'
      //   },
      //   body: JSON.stringify({ identifier: creds.username, password: creds.password })
      // });
      
      // Simulate network delay
      await new Promise(r => setTimeout(r, 1500));
      
      // Mock successful session
      this.sessionTokens = {
        cst: "mock_cst_token_" + Math.random(),
        securityToken: "mock_security_token_" + Math.random()
      };
      
      return true;
    } catch (e) {
      console.error("IG Auth Error", e);
      return false;
    }
  }

  async getMarketPrice(epic: string): Promise<number | null> {
    if (!this.sessionTokens) return null;
    // Simulate fetching real market data from IG
    return null; 
  }

  async executeTrade(symbol: string, type: TradeType, size: number): Promise<boolean> {
    if (!this.sessionTokens) return false;
    
    console.log(`[IG LIVE] Executing ${type} order for ${symbol} with size ${size}`);
    // In reality, this would be a POST to /positions/otc
    await new Promise(r => setTimeout(r, 800));
    return true;
  }

  disconnect() {
    this.sessionTokens = null;
  }
}

export const igService = new IGService();
