export type AIProvider = 'AUTO' | 'OPENAI' | 'CLAUDE' | 'GEMINI' | 'GROQ';

export interface ProviderCallConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
}

export class AIProviderSelector {
  private static PROVIDER_FALLBACK_ORDER: ('OPENAI' | 'CLAUDE' | 'GEMINI' | 'GROQ')[] = [
    'OPENAI',
    'CLAUDE',
    'GEMINI',
    'GROQ',
  ];

  /**
   * Returns sequence of providers to attempt based on user selection.
   * If 'AUTO' is selected, returns ['OPENAI', 'CLAUDE', 'GEMINI', 'GROQ'].
   */
  public static getExecutionSequence(selectedProvider: AIProvider): ('OPENAI' | 'CLAUDE' | 'GEMINI' | 'GROQ')[] {
    if (selectedProvider === 'AUTO') {
      return [...this.PROVIDER_FALLBACK_ORDER];
    }
    return [selectedProvider as 'OPENAI' | 'CLAUDE' | 'GEMINI' | 'GROQ'];
  }

  /**
   * Evaluates available API keys in environment / local storage to find the first valid provider.
   */
  public static getBestAvailableProvider(): 'OPENAI' | 'CLAUDE' | 'GEMINI' | 'GROQ' {
    const keys: Record<string, string | undefined> = {
      OPENAI: import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('OPENAI_API_KEY') || undefined,
      CLAUDE: import.meta.env.VITE_CLAUDE_API_KEY || localStorage.getItem('CLAUDE_API_KEY') || undefined,
      GEMINI: import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY') || undefined,
      GROQ:   import.meta.env.VITE_GROQ_API_KEY   || localStorage.getItem('GROQ_API_KEY')   || import.meta.env.VITE_OPENROUTER_API_KEY || undefined,
    };

    for (const provider of this.PROVIDER_FALLBACK_ORDER) {
      if (keys[provider]) return provider;
    }

    return 'GROQ'; // Default fallback
  }
}
