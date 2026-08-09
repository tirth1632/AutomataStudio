import type { DFA } from '../../../types/dfa';
import { DFAValidator } from '../Validation/DFAValidator';
import { AIProviderSelector } from './AIProviderSelector';

/**
 * AI Fallback Service:
 * When no mathematical Generator plugin can parse a complex intent,
 * calls LLM to generate DFA JSON, strictly validating the structure before returning.
 */
export async function generateDFAWithAIFallback(
  promptStr: string,
  preferredProvider: string = 'AUTO'
): Promise<DFA | null> {
  const normProvider = String(preferredProvider).toUpperCase() as any;
  const sequence = AIProviderSelector.getExecutionSequence(normProvider);

  for (const provider of sequence) {
    try {
      const dfaJson = await callLLMForDFA(promptStr, provider);
      if (dfaJson) {
        const validation = DFAValidator.validate(dfaJson);
        if (validation.isValid) {
          return dfaJson;
        }
      }
    } catch {
      // Continue to next provider in sequence
      continue;
    }
  }

  return null;
}

async function callLLMForDFA(promptStr: string, provider: string): Promise<DFA | null> {
  const apiKey =
    provider === 'GROQ'
      ? import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY
      : provider === 'GEMINI'
      ? import.meta.env.VITE_GEMINI_API_KEY
      : import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) return null;

  const systemPrompt = `You are a Theory of Computation Expert. Output strictly raw JSON representing a deterministic finite automaton (DFA) matching the user's description.
Return JSON format:
{
  "alphabet": ["0", "1"],
  "states": ["q0", "q1", ...],
  "startState": "q0",
  "acceptStates": ["q1"],
  "transitions": {
    "q0": { "0": "q0", "1": "q1" },
    "q1": { "0": "q0", "1": "q1" }
  }
}
Rules:
1. Every state MUST have transitions for EVERY symbol in alphabet.
2. Output NO markdown formatting, NO markdown backticks, ONLY raw JSON.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: provider === 'GROQ' ? 'groq/llama-3.3-70b-versatile' : 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate DFA for language: ${promptStr}` },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || '';
  content = content.replace(/```json/gi, '').replace(/```/g, '').trim();

  const parsed = JSON.parse(content) as DFA;
  return parsed;
}
