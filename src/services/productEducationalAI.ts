import { loadAPIKeys, loadPreferredProvider } from './aiProviders';

const explanationCache = new Map<string, string>();

export interface ProductEducationalInsight {
  theory: string;
  commonMistakes: string;
  examTip: string;
  memoryTrick: string;
  realWorldAnalogy: string;
  aiModelUsed?: string;
  isAI?: boolean;
}

/** Represents a selectable model option for the insights panel */
export interface ModelOption {
  key: string;
  label: string;
  provider: 'groq' | 'openrouter' | 'gemini' | 'openai' | 'auto';
  model: string;
  badge: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  { key: 'auto',                     label: 'Auto (Best Available)',        provider: 'auto',       model: 'auto',                              badge: '✦' },
  { key: 'groq-llama-70b',           label: 'Llama 3.3 70B',               provider: 'groq',       model: 'llama-3.3-70b-versatile',           badge: 'Groq' },
  { key: 'groq-llama-8b',            label: 'Llama 3.1 8B (Fast)',         provider: 'groq',       model: 'llama-3.1-8b-instant',              badge: 'Groq' },
  { key: 'groq-mixtral',             label: 'Mixtral 8×7B',                provider: 'groq',       model: 'mixtral-8x7b-32768',                badge: 'Groq' },
  { key: 'groq-gemma',               label: 'Gemma 2 9B',                  provider: 'groq',       model: 'gemma2-9b-it',                      badge: 'Groq' },
  { key: 'openrouter-gpt4o-mini',    label: 'GPT-4o Mini',                 provider: 'openrouter', model: 'openai/gpt-4o-mini',                badge: 'OR' },
  { key: 'openrouter-claude-haiku',  label: 'Claude 3 Haiku',              provider: 'openrouter', model: 'anthropic/claude-3-haiku',          badge: 'OR' },
  { key: 'openrouter-gemini-flash',  label: 'Gemini Flash (OR)',           provider: 'openrouter', model: 'google/gemini-flash-1.5',           badge: 'OR' },
  { key: 'gemini-2-flash',           label: 'Gemini 2.0 Flash',            provider: 'gemini',     model: 'gemini-2.0-flash',                  badge: 'GGL' },
  { key: 'gemini-15-pro',            label: 'Gemini 1.5 Pro',              provider: 'gemini',     model: 'gemini-1.5-pro',                    badge: 'GGL' },
  { key: 'openai-gpt4o-mini',        label: 'GPT-4o Mini (Direct)',        provider: 'openai',     model: 'gpt-4o-mini',                       badge: 'OAI' },
  { key: 'openai-gpt35',             label: 'GPT-3.5 Turbo',               provider: 'openai',     model: 'gpt-3.5-turbo',                     badge: 'OAI' },
];

const insightCache = new Map<string, ProductEducationalInsight>();

/* ─────────────────────────────────────────────────────────
   BUILT-IN FALLBACK EXPLANATIONS (100% Deterministic)
───────────────────────────────────────────────────────── */

export function getBuiltInAcceptExplanation(
  operation: 'AND' | 'OR' | 'DIFF' | 'XOR',
  q1: string, q2: string,
  isAcc1: boolean, isAcc2: boolean, isAcceptResult: boolean
): string {
  const q1Text = isAcc1 ? `${q1} ∈ F_A (Accepting)` : `${q1} ∉ F_A (Non-accepting)`;
  const q2Text = isAcc2 ? `${q2} ∈ F_B (Accepting)` : `${q2} ∉ F_B (Non-accepting)`;
  switch (operation) {
    case 'OR':
      return isAcceptResult
        ? `Union (A ∪ B) accepts if either component state is accepting. Here ${isAcc1 ? q1Text : q2Text}, so composite state (${q1}, ${q2}) evaluates to ACCEPT.`
        : `Union (A ∪ B) requires at least one component to be in an accepting state. Since neither ${q1} nor ${q2} is in F, state (${q1}, ${q2}) evaluates to REJECT.`;
    case 'AND':
      return isAcceptResult
        ? `Intersection (A ∩ B) requires BOTH component states to be accepting (${q1} ∈ F_A AND ${q2} ∈ F_B). Both conditions are satisfied.`
        : `Intersection (A ∩ B) requires both states to accept. Here ${!isAcc1 ? q1Text : q2Text}, so REJECT.`;
    case 'DIFF':
      return isAcceptResult
        ? `Difference (A \\ B) accepts if DFA A accepts AND DFA B rejects. Both conditions hold → ACCEPT.`
        : `Difference (A \\ B) requires qA ∈ F_A and qB ∉ F_B. ${!isAcc1 ? `${q1} not accepting in A` : `${q2} is accepting in B`} → REJECT.`;
    case 'XOR':
      return isAcceptResult
        ? `Symmetric Difference (A ⊕ B) accepts if EXACTLY ONE component accepts. ${q1Text} while ${q2Text} → ACCEPT.`
        : `Symmetric Difference (A ⊕ B) rejects when both have same acceptance (${isAcc1 ? 'both accept' : 'neither accepts'}) → REJECT.`;
    default:
      return `Composite state (${q1}, ${q2}) evaluates to ${isAcceptResult ? 'ACCEPT' : 'REJECT'}.`;
  }
}

export function getBuiltInFormulaExplanation(operation: 'AND' | 'OR' | 'DIFF' | 'XOR'): string {
  switch (operation) {
    case 'OR':   return 'Union Rule: F_Product = (F_A × Q_B) ∪ (Q_A × F_B). A product state (q_A, q_B) is in F_Product if q_A accepts in A OR q_B accepts in B.';
    case 'AND':  return 'Intersection Rule: F_Product = F_A × F_B. A product state (q_A, q_B) accepts only if BOTH q_A ∈ F_A AND q_B ∈ F_B.';
    case 'DIFF': return 'Difference Rule: F_Product = F_A × (Q_B \\ F_B). Accepts if q_A ∈ F_A AND q_B ∉ F_B.';
    case 'XOR':  return 'Symmetric Difference: F_Product = (F_A × (Q_B \\ F_B)) ∪ ((Q_A \\ F_A) × F_B). Accepts if exactly one component accepts.';
  }
}

export function getBuiltInAlgorithmInsights(operation: 'AND' | 'OR' | 'DIFF' | 'XOR'): ProductEducationalInsight {
  const map: Record<string, ProductEducationalInsight> = {
    OR: {
      theory: 'Product Construction tracks both DFAs concurrently in product state pairs (qA, qB). For Union, any string accepted by either M1 or M2 is accepted by M_Product.',
      commonMistakes: 'Mistaking Union for NFA branching. Product DFA is deterministic — each product state has exactly 1 outgoing transition per alphabet symbol.',
      examTip: 'Remember F_Union = (F_A × Q_B) ∪ (Q_A × F_B). Every pair with at least one accepting state belongs to F_Union.',
      memoryTrick: 'Union = OR = Generous. If either DFA is happy (accepting), the Product DFA is happy.',
      realWorldAnalogy: 'Two security gates. If either Gate A or Gate B approves your ticket, you enter the terminal.',
      isAI: false,
    },
    AND: {
      theory: 'Intersection constructs a DFA accepting L(M1) ∩ L(M2). Both DFAs run in lockstep; only pairs where both states are in F_A × F_B accept.',
      commonMistakes: 'Forgetting that component DFAs must be COMPLETE (with trap/dead states) before computing Cartesian product.',
      examTip: 'F_Intersection = F_A × F_B. Count |F_A| × |F_B| for the max possible accepting states in the Product DFA.',
      memoryTrick: 'Intersection = AND = Strict. Both DFAs must say YES simultaneously.',
      realWorldAnalogy: 'Dual-control bank vault: both the Manager key AND the Teller key must turn to unlock.',
      isAI: false,
    },
    DIFF: {
      theory: 'Difference constructs a DFA for L(M1) \\ L(M2) = L(M1) ∩ L(M2)^c. Accept states are pairs where qA ∈ F_A AND qB ∉ F_B.',
      commonMistakes: 'Confusing A \\ B with B \\ A. Order matters! A \\ B accepts strings in L(A) that are NOT in L(B).',
      examTip: 'To compute L(A) \\ L(B), complement B first (flip F_B), then intersect with A.',
      memoryTrick: 'Difference = A YES, B NO. DFA A must approve, DFA B must reject.',
      realWorldAnalogy: 'Email filter: message passes filter A (Valid Format) AND does NOT trigger filter B (Spam).',
      isAI: false,
    },
    XOR: {
      theory: 'Symmetric Difference accepts strings accepted by EXACTLY ONE DFA: L1 ⊕ L2 = (L1 \\ L2) ∪ (L2 \\ L1).',
      commonMistakes: 'Including pairs where both states accept (F_A × F_B). XOR rejects when both DFAs agree!',
      examTip: 'L(M1) ⊕ L(M2) = ∅ iff L(M1) = L(M2). This is how DFA equivalence is formally proved.',
      memoryTrick: 'XOR = Disagreement. Accepts only when DFA A and DFA B disagree on an input.',
      realWorldAnalogy: 'Two judges: you advance to the tiebreaker only if the judges disagree on your performance.',
      isAI: false,
    },
  };
  return map[operation] || map.OR;
}

/* ─────────────────────────────────────────────────────────
   PROVIDER CALLERS
───────────────────────────────────────────────────────── */

async function callGroq(prompt: string, systemPrompt: string, key: string, model: string): Promise<{ text: string; label: string }> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
      temperature: 0.4, max_tokens: 600,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})) as any; throw new Error(`Groq ${res.status}: ${e?.error?.message || res.statusText}`); }
  const data = await res.json() as any;
  return { text: data.choices?.[0]?.message?.content || '{}', label: `Groq (${model})` };
}

async function callOpenRouter(prompt: string, systemPrompt: string, key: string, model: string): Promise<{ text: string; label: string }> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Authorization: `Bearer ${key}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
      'X-Title': 'Automata Studio',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
      temperature: 0.4, max_tokens: 600,
    }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})) as any; throw new Error(`OpenRouter ${res.status}: ${e?.error?.message || res.statusText}`); }
  const data = await res.json() as any;
  return { text: data.choices?.[0]?.message?.content || '{}', label: `OpenRouter (${model.split('/')[1] || model})` };
}

async function callGemini(prompt: string, systemPrompt: string, key: string, model: string): Promise<{ text: string; label: string }> {
  const modelsToTry = model === 'auto' ? ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-pro'] : [model];
  for (const m of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: prompt }], role: 'user' }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 600, responseMimeType: 'application/json' },
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})) as any; if (res.status === 404) continue; throw new Error(`Gemini ${res.status}: ${e?.error?.message || res.statusText}`); }
      const data = await res.json() as any;
      return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || '{}', label: `Gemini (${m})` };
    } catch (e) { if ((e as Error).message?.includes('404')) continue; throw e; }
  }
  throw new Error('No working Gemini model found');
}

async function callOpenAI(prompt: string, systemPrompt: string, key: string, model: string): Promise<{ text: string; label: string }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
      temperature: 0.4, max_tokens: 600,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})) as any; throw new Error(`OpenAI ${res.status}: ${e?.error?.message || res.statusText}`); }
  const data = await res.json() as any;
  return { text: data.choices?.[0]?.message?.content || '{}', label: `OpenAI (${model})` };
}

/* ─────────────────────────────────────────────────────────
   UNIFIED CALLER — respects ModelOption selection
───────────────────────────────────────────────────────── */

async function callWithModelOption(
  userPrompt: string,
  systemPrompt: string,
  modelOption: ModelOption
): Promise<{ text: string; label: string }> {
  const keys = loadAPIKeys();
  const preferred = loadPreferredProvider();

  // If a specific (non-auto) model is selected, call that provider directly
  if (modelOption.provider !== 'auto') {
    const { provider, model } = modelOption;
    const key = keys[provider as keyof typeof keys];
    if (!key) throw new Error(`No API key configured for ${provider}. Add it in Settings.`);
    switch (provider) {
      case 'groq':       return callGroq(userPrompt, systemPrompt, key, model);
      case 'openrouter': return callOpenRouter(userPrompt, systemPrompt, key, model);
      case 'gemini':     return callGemini(userPrompt, systemPrompt, key, model);
      case 'openai':     return callOpenAI(userPrompt, systemPrompt, key, model);
    }
  }

  // Auto mode: try preferred provider first, then all others
  type Entry = { provider: string; fn: () => Promise<{ text: string; label: string }> };
  const all: Entry[] = [
    keys.groq       ? { provider: 'groq',       fn: () => callGroq(userPrompt, systemPrompt, keys.groq!, 'llama-3.3-70b-versatile') } : null,
    keys.openrouter ? { provider: 'openrouter', fn: () => callOpenRouter(userPrompt, systemPrompt, keys.openrouter!, 'openai/gpt-4o-mini') } : null,
    keys.gemini     ? { provider: 'gemini',     fn: () => callGemini(userPrompt, systemPrompt, keys.gemini!, 'auto') } : null,
    keys.openai     ? { provider: 'openai',     fn: () => callOpenAI(userPrompt, systemPrompt, keys.openai!, 'gpt-4o-mini') } : null,
  ].filter(Boolean) as Entry[];

  if (all.length === 0) throw new Error('No API keys configured. Add a key in Settings to enable AI.');

  // Move preferred to front
  const pi = all.findIndex(e => e.provider === preferred);
  if (pi > 0) { const [p] = all.splice(pi, 1); all.unshift(p); }

  const errors: string[] = [];
  for (const entry of all) {
    try { return await entry.fn(); }
    catch (e) { errors.push(`${entry.provider}: ${(e as Error).message}`); }
  }
  throw new Error(`All providers failed:\n${errors.join('\n')}`);
}

/* ─────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────── */

export async function fetchAIAcceptExplanation(
  operation: 'AND' | 'OR' | 'DIFF' | 'XOR',
  q1: string, q2: string,
  isAcc1: boolean, isAcc2: boolean, isAcceptResult: boolean
): Promise<string> {
  const cacheKey = `accept_${operation}_${q1}_${q2}_${isAcc1}_${isAcc2}`;
  if (explanationCache.has(cacheKey)) return explanationCache.get(cacheKey)!;

  const builtIn = getBuiltInAcceptExplanation(operation, q1, q2, isAcc1, isAcc2, isAcceptResult);
  const autoOption = MODEL_OPTIONS[0]; // 'auto'
  const systemPrompt = 'You are a Theory of Computation professor. Respond ONLY with plain text (1-2 sentences, no markdown, no JSON).';
  const userPrompt = `Explain in 1-2 beginner-friendly sentences why composite state (${q1}, ${q2}) evaluates to ${isAcceptResult ? 'ACCEPT' : 'REJECT'} under the ${operation} operation in DFA product construction. DFA A state ${q1} is ${isAcc1 ? 'accepting' : 'non-accepting'} and DFA B state ${q2} is ${isAcc2 ? 'accepting' : 'non-accepting'}.`;

  try {
    const { text } = await callWithModelOption(userPrompt, systemPrompt, autoOption);
    const clean = text.trim().replace(/^["']|["']$/g, '').replace(/\n+/g, ' ');
    if (clean.length > 10) { explanationCache.set(cacheKey, clean); return clean; }
  } catch (e) { console.warn('[ProductAI] Accept explanation failed, using built-in:', e); }

  explanationCache.set(cacheKey, builtIn);
  return builtIn;
}

/**
 * Fetches AI-generated algorithm insights.
 * Pass `modelOption` to override model; pass `bustCache=true` to force re-fetch.
 */
export async function fetchAIAlgorithmInsights(
  operation: 'AND' | 'OR' | 'DIFF' | 'XOR',
  modelOption: ModelOption = MODEL_OPTIONS[0],
  bustCache = false
): Promise<ProductEducationalInsight> {
  const cacheKey = `insight_${operation}_${modelOption.key}`;
  if (!bustCache && insightCache.has(cacheKey)) return insightCache.get(cacheKey)!;

  const builtIn = getBuiltInAlgorithmInsights(operation);
  const opLabel = { OR: 'Union (A ∪ B)', AND: 'Intersection (A ∩ B)', DIFF: 'Difference (A \\ B)', XOR: 'Symmetric Difference (A ⊕ B)' }[operation];

  const systemPrompt = `You are a Theory of Computation professor. Return ONLY a valid JSON object with no extra text, no markdown fences.`;
  const userPrompt = `Generate educational insights for DFA Product Construction — the ${opLabel} operation.

Return ONLY this JSON (all values must be clear, concise, 1-2 sentence strings):
{
  "theory": "...",
  "commonMistakes": "...",
  "examTip": "...",
  "memoryTrick": "...",
  "realWorldAnalogy": "..."
}`;

  try {
    const { text, label } = await callWithModelOption(userPrompt, systemPrompt, modelOption);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object in response');
    const parsed = JSON.parse(match[0]);

    const result: ProductEducationalInsight = {
      theory:           parsed.theory           || builtIn.theory,
      commonMistakes:   parsed.commonMistakes   || builtIn.commonMistakes,
      examTip:          parsed.examTip          || builtIn.examTip,
      memoryTrick:      parsed.memoryTrick      || builtIn.memoryTrick,
      realWorldAnalogy: parsed.realWorldAnalogy || builtIn.realWorldAnalogy,
      aiModelUsed:      label,
      isAI:             true,
    };

    insightCache.set(cacheKey, result);
    return result;
  } catch (e) {
    console.warn('[ProductAI] Algorithm insights failed, using built-in:', e);
  }

  insightCache.set(cacheKey, builtIn);
  return builtIn;
}
