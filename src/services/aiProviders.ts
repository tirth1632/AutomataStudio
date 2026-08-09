import type { AutomatonGraph, AutomatonState, AutomatonTransition, GeneratedAutomatonResult } from '../types/automata';
import type { AIProvider, APIKeys } from '../types/automata';
import { applyDagreLayout } from './layoutEngine';

export type { AIProvider, APIKeys };

// ── Read keys from .env (VITE_ prefix) ──────────────
const ENV_KEYS: APIKeys = {
  openai:     import.meta.env.VITE_OPENAI_API_KEY     || '',
  claude:     import.meta.env.VITE_CLAUDE_API_KEY     || '',
  openrouter: import.meta.env.VITE_OPENROUTER_API_KEY || '',
  groq:       import.meta.env.VITE_GROQ_API_KEY       || '',
  gemini:     import.meta.env.VITE_GEMINI_API_KEY      || '',
};

const STORAGE_KEY  = 'automata_studio_api_keys';
const PROVIDER_KEY = 'automata_studio_provider';

export function loadAPIKeys(): APIKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored: Partial<APIKeys> = raw ? JSON.parse(raw) : {};
    return {
      openai:     stored.openai     || ENV_KEYS.openai,
      claude:     stored.claude     || ENV_KEYS.claude,
      openrouter: stored.openrouter || ENV_KEYS.openrouter,
      groq:       stored.groq       || ENV_KEYS.groq,
      gemini:     stored.gemini     || ENV_KEYS.gemini,
    };
  } catch {
    return { ...ENV_KEYS };
  }
}


export function saveAPIKeys(keys: APIKeys): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function loadPreferredProvider(): AIProvider {
  return (localStorage.getItem(PROVIDER_KEY) as AIProvider) || 'openrouter';
}

export function savePreferredProvider(p: AIProvider): void {
  localStorage.setItem(PROVIDER_KEY, p);
}

// ── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Theory of Computation expert.
Your job is to generate mathematically COMPLETE Deterministic Finite Automata (DFA).

STRICT DFA MATHEMATICAL RULES (CRITICAL):
1. The automaton MUST be a complete DFA ("type": "DFA").
2. EVERY state MUST have EXACTLY ONE outgoing transition for EVERY symbol in the alphabet.
   Formula: total_number_of_transitions = number_of_states × alphabet_size.
   - For alphabet ["0", "1"]:
     State q0 MUST have 1 outgoing transition for "0" AND 1 outgoing transition for "1".
     State q1 MUST have 1 outgoing transition for "0" AND 1 outgoing transition for "1".
     If there are 2 states, there MUST be EXACTLY 4 transitions in total.
   - NEVER omit transitions. If a state doesn't accept a symbol, it must transition to another state or stay in itself.

3. Exactly ONE startState ("q0").
4. At least ONE acceptState.
5. State IDs must be q0, q1, q2, ...
6. Return ONLY valid JSON with no markdown, no text outside JSON.

EXAMPLES OF CORRECT COMPLETE DFAs:

Example 1: "Accept binary strings ending with 0"
Alphabet: ["0", "1"]
States: q0 (Start), q1 (Accept, End 0)
Transitions (4 total):
- q0 on "1" -> q0
- q0 on "0" -> q1
- q1 on "0" -> q1
- q1 on "1" -> q0

Example 2: "Accept binary strings ending with 101"
Alphabet: ["0", "1"]
States: q0 (Start), q1 (Got 1), q2 (Got 10), q3 (Accept, Got 101)
Transitions (8 total):
- q0 on "0" -> q0, q0 on "1" -> q1
- q1 on "0" -> q2, q1 on "1" -> q1
- q2 on "0" -> q0, q2 on "1" -> q3
- q3 on "0" -> q2, q3 on "1" -> q1

Exact JSON format:
{
  "type": "DFA",
  "alphabet": ["0","1"],
  "states": [
    { "id": "q0", "label": "Start" },
    { "id": "q1", "label": "End 0" }
  ],
  "startState": "q0",
  "acceptStates": ["q1"],
  "transitions": [
    { "from": "q0", "to": "q0", "symbol": "1" },
    { "from": "q0", "to": "q1", "symbol": "0" },
    { "from": "q1", "to": "q1", "symbol": "0" },
    { "from": "q1", "to": "q0", "symbol": "1" }
  ],
  "explanation": "State q0 represents strings not ending in 0. State q1 represents strings ending in 0.",
  "acceptedExamples": ["0", "10", "100", "010"],
  "rejectedExamples": ["1", "01", "101", "001"]
}`;

export interface AIAutomatonJSON {
  type: 'DFA' | 'NFA' | 'ENFA';
  alphabet: string[];
  states: { id: string; label: string }[];
  startState: string;
  acceptStates: string[];
  transitions: { from: string; to: string; symbol: string }[];
  explanation: string;
  acceptedExamples: string[];
  rejectedExamples: string[];
}

// ── STRICT DFA VALIDATION ────────────────────────────────────────────────────

export interface DFAValidationResult {
  isValid: boolean;
  errors: string[];
  missingTransitions: { stateId: string; symbol: string }[];
}

export function validateStrictDFA(aiJson: AIAutomatonJSON): DFAValidationResult {
  const errors: string[] = [];
  const missingTransitions: { stateId: string; symbol: string }[] = [];

  // 1. Must be a DFA
  if (aiJson.type !== 'DFA') {
    errors.push(`Automaton type is '${aiJson.type}' instead of 'DFA'. A complete DFA is required.`);
  }

  // 2. Exactly one start state
  if (!aiJson.startState) {
    errors.push('Missing start state.');
  } else if (!aiJson.states.some((s) => s.id === aiJson.startState)) {
    errors.push(`Start state '${aiJson.startState}' is not in the list of states.`);
  }

  // 3. At least one accept state
  if (!aiJson.acceptStates || aiJson.acceptStates.length === 0) {
    errors.push('At least one accept state must exist.');
  }

  // 4. Every state must have exactly ONE outgoing transition for EVERY symbol in the alphabet
  const alphabet = aiJson.alphabet || [];
  if (alphabet.length === 0) {
    errors.push('Alphabet is empty.');
  }

  for (const state of aiJson.states) {
    for (const symbol of alphabet) {
      const matching = aiJson.transitions.filter(
        (t) => t.from === state.id && t.symbol === symbol
      );

      if (matching.length === 0) {
        missingTransitions.push({ stateId: state.id, symbol });
        errors.push(
          `State '${state.id}' is missing outgoing transition for symbol '${symbol}'.`
        );
      } else if (matching.length > 1) {
        errors.push(
          `State '${state.id}' has ${matching.length} outgoing transitions for symbol '${symbol}' (DFA requires exactly 1).`
        );
      }
    }
  }

  const expectedTotal = aiJson.states.length * alphabet.length;
  if (aiJson.transitions.length !== expectedTotal && missingTransitions.length === 0 && errors.length === 0) {
    errors.push(
      `DFA has ${aiJson.transitions.length} transitions, expected ${expectedTotal} (${aiJson.states.length} states × ${alphabet.length} symbols).`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    missingTransitions,
  };
}

// ── Strip markdown fences ────────────────────────────────────────────────────

function extractJSON(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

// ── JSON → AutomatonGraph ────────────────────────────────────────────────────

function convertToResult(aiJson: AIAutomatonJSON, prompt: string): GeneratedAutomatonResult {
  const mergedMap = new Map<string, Set<string>>();
  for (const t of aiJson.transitions) {
    const key = `${t.from}__${t.to}`;
    if (!mergedMap.has(key)) mergedMap.set(key, new Set());
    mergedMap.get(key)!.add(t.symbol);
  }

  const transitions: AutomatonTransition[] = [];
  mergedMap.forEach((symbols, key) => {
    const [source, target] = key.split('__');
    transitions.push({
      id: `t_${source}_${target}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      source,
      target,
      symbols: Array.from(symbols),
    });
  });

  const states: AutomatonState[] = aiJson.states.map((s) => ({
    id: s.id,
    label: s.label,
    isStart: s.id === aiJson.startState,
    isAccept: aiJson.acceptStates.includes(s.id),
    x: 0,
    y: 0,
  }));

  const rawGraph: AutomatonGraph = {
    id: `ai_${Date.now()}`,
    name: prompt.slice(0, 60),
    type: aiJson.type,
    alphabet: aiJson.alphabet,
    states,
    transitions,
  };

  const graph = applyDagreLayout(rawGraph);

  const stateDescriptions: Record<string, string> = {};
  aiJson.states.forEach((s) => { stateDescriptions[s.id] = s.label; });

  const transitionTable = graph.states.map((state) => {
    const row: { state: string; [sym: string]: string } = {
      state: `${state.id}${state.isStart ? ' →' : ''}${state.isAccept ? ' *' : ''}`,
    };
    for (const sym of aiJson.alphabet) {
      const t = graph.transitions.find(
        (tr) => tr.source === state.id && tr.symbols.includes(sym)
      );
      row[sym] = t ? t.target : '∅';
    }
    return row;
  });

  return {
    graph,
    explanation: aiJson.explanation,
    stateDescriptions,
    transitionTable,
    acceptedSamples: aiJson.acceptedExamples || [],
    rejectedSamples: aiJson.rejectedExamples || [],
  };
}

// ── LLM Callers ──────────────────────────────────────────────────────────────

async function callOpenRouter(prompt: string, apiKey: string): Promise<AIAutomatonJSON> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Automata Studio',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(`OpenRouter ${res.status}: ${err?.error?.message || res.statusText}`);
  }

  const data = await res.json() as any;
  const raw = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(extractJSON(raw));
}

async function callGroq(prompt: string, apiKey: string): Promise<AIAutomatonJSON> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(`Groq ${res.status}: ${err?.error?.message || res.statusText}`);
  }

  const data = await res.json() as any;
  const raw = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(extractJSON(raw));
}

async function callGemini(prompt: string, apiKey: string): Promise<AIAutomatonJSON> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: prompt }], role: 'user' }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(`Gemini ${res.status}: ${err?.error?.message || res.statusText}`);
  }

  const data = await res.json() as any;
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(extractJSON(raw));
}

async function fetchRawJSON(provider: AIProvider, prompt: string, key: string): Promise<AIAutomatonJSON> {
  if (provider === 'openrouter') return await callOpenRouter(prompt, key);
  if (provider === 'groq')       return await callGroq(prompt, key);
  return await callGemini(prompt, key);
}

// ── Main Entry Point with Validation & Re-prompting ──────────────────────────
export async function generateAutomatonWithAI(
  userPrompt: string,
  provider: AIProvider,
  apiKeys: APIKeys
): Promise<GeneratedAutomatonResult> {
  const providersToTry: AIProvider[] = ([provider, 'openrouter', 'groq', 'gemini'] as AIProvider[]).filter(
    (p, idx, self) => self.indexOf(p) === idx
  );

  const errors: string[] = [];

  for (const currentProvider of providersToTry) {
    const key = apiKeys[currentProvider as keyof APIKeys];
    if (!key) continue;

    try {
      // Step 1: Initial call
      let aiJson = await fetchRawJSON(currentProvider, userPrompt, key);

      // Step 2: Validate strict DFA completeness
      let validation = validateStrictDFA(aiJson);

      // Step 3: If incomplete DFA, re-prompt AI asking for missing/corrected transitions
      if (!validation.isValid) {
        console.warn(`[AI Validation] Initial DFA from ${currentProvider} was invalid. Requesting auto-correction…`, validation.errors);

        const correctionPrompt = `The previous DFA you generated for "${userPrompt}" is mathematically incomplete or invalid.

Validation errors:
${validation.errors.map((e) => `- ${e}`).join('\n')}

${
  validation.missingTransitions.length > 0
    ? `Missing transitions to add:\n${validation.missingTransitions
        .map((m) => `- State '${m.stateId}' needs an outgoing transition for symbol '${m.symbol}'`)
        .join('\n')}`
    : ''
}

Please generate ALL missing transitions so that EVERY state has EXACTLY ONE outgoing transition for EVERY symbol in the alphabet [${(aiJson.alphabet || ['0','1']).join(',')}] (total transitions must equal ${aiJson.states.length} × ${aiJson.alphabet?.length || 2}).

Return ONLY the corrected JSON adhering to the exact schema.`;

        try {
          const correctedJson = await fetchRawJSON(currentProvider, correctionPrompt, key);
          const reValidation = validateStrictDFA(correctedJson);

          if (reValidation.isValid) {
            aiJson = correctedJson;
            validation = reValidation;
          } else {
            console.warn(`[AI Validation] Auto-corrected DFA from ${currentProvider} still invalid:`, reValidation.errors);
          }
        } catch (retryErr) {
          console.warn(`[AI Validation] Re-prompting ${currentProvider} failed:`, retryErr);
        }
      }

      // Step 4: Refuse invalid DFAs and throw error (never render invalid DFA)
      if (!validation.isValid) {
        throw new Error(
          `Incomplete DFA returned by ${currentProvider}. Validation errors:\n${validation.errors.map((e) => `• ${e}`).join('\n')}`
        );
      }

      return convertToResult(aiJson, userPrompt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${currentProvider}: ${msg}`);
      console.warn(`[AI] Provider ${currentProvider} failed:`, msg);
    }
  }

  throw new Error(
    `Failed to generate a valid DFA after checking all providers:\n${errors.map((e) => `• ${e}`).join('\n')}`
  );
}

/**
 * Fetches natural, human-readable educational text explanation from configured AI provider.
 */
export async function fetchAITextExplanation(
  prompt: string,
  provider: AIProvider,
  apiKeys: APIKeys
): Promise<string> {
  const key = apiKeys[provider as keyof APIKeys] || apiKeys.openrouter || apiKeys.gemini || apiKeys.groq;
  if (!key) return '';

  const systemText = `You are a distinguished Theory of Computation Professor & Automata Tutor.
Your goal is to provide clear, intuitive, and natural educational explanations for DFAs, regular languages, and automata theory concepts.
Be concise, highly readable, and structured with clean markdown headers and bullet points. Never output raw json or ugly debug brackets.`;

  try {
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemText }] },
          contents: [{ parts: [{ text: prompt }], role: 'user' }],
        }),
      });
      if (!res.ok) return '';
      const data = (await res.json()) as any;
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemText },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
        }),
      });
      if (!res.ok) return '';
      const data = (await res.json()) as any;
      return data.choices?.[0]?.message?.content || '';
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'auto',
        messages: [
          { role: 'system', content: systemText },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });
    if (!res.ok) return '';
    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content || '';
  } catch {
    return '';
  }
}

