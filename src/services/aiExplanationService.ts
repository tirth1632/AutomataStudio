import type { AutomatonGraph, APIKeys, AIProvider } from '../types/automata';
import { loadAPIKeys } from './aiProviders';

export interface QuestionAIExplanation {
  question: string;
  languageDescription: string;
  summary: string;
  stateInvariants: Array<{ stateId: string; meaning: string }>;
  transitionLogic: string;
  acceptanceCriteria: string;
  theoreticalInsight: string;
  acceptedExamples: string[];
  rejectedExamples: string[];
  aiModelUsed?: string;
  isAI?: boolean;
}

// Helper to extract JSON from markdown fences if returned by LLM
function extractJSON(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

/**
 * Deterministic Question Explanation Generator (Fallback when offline or API call fails)
 * Generates exact question-based invariants and descriptions tailored to the specific problem.
 */
export function generateDeterministicQuestionExplanation(
  question: string,
  graph: AutomatonGraph
): QuestionAIExplanation {
  const qLower = question.toLowerCase();
  const startState = graph.states.find((s) => s.isStart)?.id || 'q0';
  const acceptStateIds = graph.states.filter((s) => s.isAccept).map((s) => s.id);
  const acceptListStr = acceptStateIds.length > 0 ? `{${acceptStateIds.join(', ')}}` : 'none';

  // 1. Second-Last Symbol Pattern
  if (qLower.includes('second last') || qLower.includes('2nd last')) {
    const symbol = qLower.includes('0') ? '0' : '1';
    const otherSymbol = symbol === '1' ? '0' : '1';

    const invariants: Array<{ stateId: string; meaning: string }> = [];
    graph.states.forEach((s) => {
      const label = s.label.replace(/^q/, '');
      if (label.length === 2) {
        const secLast = label[0];
        const last = label[1];
        const isAcc = secLast === symbol;
        invariants.push({
          stateId: s.id,
          meaning: `State ${s.id} (${s.label}): Tracks last 2 symbols read as '${secLast}${last}'. Second-to-last symbol is '${secLast}' (${
            isAcc ? 'MATCH → Accept State' : 'No Match → Non-accepting'
          }).`,
        });
      } else {
        invariants.push({
          stateId: s.id,
          meaning: `State ${s.id} (${s.label}): ${
            s.isStart
              ? 'Start state before reading 2 symbols'
              : s.isAccept
              ? 'Accept state where 2nd last symbol was ' + symbol
              : 'Intermediate tracking state'
          }.`,
        });
      }
    });

    return {
      question,
      languageDescription: `L = { w ∈ {0,1}* | |w| ≥ 2 and the second-to-last symbol of w is '${symbol}' }`,
      summary: `This DFA maintains a sliding window of the last 2 symbols read. It requires 2² = 4 states to store the combinations {00, 01, 10, 11}. States where the first character of the window is '${symbol}' are accepting states.`,
      stateInvariants: invariants,
      transitionLogic: `On reading a new input character c, the machine slides its memory window by shifting out the oldest symbol and appending c: (b1 b0) + c → (b0 c).`,
      acceptanceCriteria: `A binary string w is accepted if and only if computation halts in state set ${acceptListStr}, guaranteeing that symbol at index |w|-1 is '${symbol}'.`,
      theoreticalInsight: `By Myhill-Nerode Theorem, recognizing the k-th last symbol over alphabet Σ requires an equivalence class for every suffix of length k. Minimum states required = |Σ|^k = 2² = 4 states.`,
      acceptedExamples: [symbol + otherSymbol, symbol + symbol, '0' + symbol + '0', '1' + symbol + '1'],
      rejectedExamples: [otherSymbol, symbol, otherSymbol + otherSymbol, otherSymbol + symbol],
      isAI: false,
      aiModelUsed: 'Rule-Based Engine (Question-Specific)',
    };
  }

  // 2. Alternating Pattern (e.g. alternating 0s and 1s, alternating 00s and 11s)
  if (qLower.includes('alternat')) {
    const altMatch = question.match(/alternat(?:ing|e)?\s+(?:blocks?\s+of\s+)?([01a-z]+?)(?:'s|s)?\s*(?:and|,)\s*([01a-z]+?)(?:'s|s)?/i);
    const blockA = altMatch ? altMatch[1].replace(/(?:'s|s)$/i, '') : '0';
    const blockB = altMatch ? altMatch[2].replace(/(?:'s|s)$/i, '') : '1';

    const isMultiChar = blockA.length > 1 || blockB.length > 1;

    const invariants: Array<{ stateId: string; meaning: string }> = graph.states.map((s) => ({
      stateId: s.id,
      meaning: `State ${s.id} (${s.label}): ${
        s.isStart && s.isAccept
          ? 'Start & Accept State: Empty string ε (no symbols read yet).'
          : s.isAccept
          ? `Accept State: A complete block of "${blockA}" or "${blockB}" was successfully read.`
          : s.id.includes('trap') || s.label.toLowerCase().includes('trap')
          ? 'Trap State: Sequence violation detected. Permanent rejection.'
          : `Partial Match State: Reading symbols towards block "${blockA}" or "${blockB}".`
      }`,
    }));

    const acceptedEx = isMultiChar
      ? ['', blockA, blockB, blockA + blockA, blockB + blockB, blockA + blockB, blockB + blockA, blockA + blockB + blockA]
      : ['', '0', '1', '01', '10', '010', '101', '0101'];

    const rejectedEx = isMultiChar
      ? ['0', '1', blockA.slice(0, Math.max(1, blockA.length - 1)), blockA + blockB.slice(0, Math.max(1, blockB.length - 1)), '0101']
      : ['00', '11', '011', '100'];

    return {
      question,
      languageDescription: `L = { w ∈ {0,1}* | w is composed of alternating blocks of "${blockA}" and "${blockB}" }`,
      summary: `This DFA recognizes language L where symbols transition between blocks of "${blockA}" and "${blockB}". Any symbol sequence violating the block structure transitions to a trap state.`,
      stateInvariants: invariants,
      transitionLogic: `Reading symbols matching the active block advances towards an accept state. Mismatched symbols lead to an unrecoverable trap state.`,
      acceptanceCriteria: `Input string w is accepted if final state is in ${acceptListStr}, confirming valid alternating blocks of "${blockA}" and "${blockB}".`,
      theoreticalInsight: `Block alternating patterns require tracking progress through each block prefix. Hopcroft minimization merges equivalent completed block states.`,
      acceptedExamples: acceptedEx,
      rejectedExamples: rejectedEx,
      isAI: false,
      aiModelUsed: 'Rule-Based Engine (Question-Specific)',
    };
  }

  // 3. Even / Odd Count Pattern (e.g., Even 0s, Even 1s)
  if (qLower.includes('even') || qLower.includes('odd')) {
    const symbol = qLower.includes('0') ? '0' : '1';
    const targetParity = qLower.includes('even') ? 'even' : 'odd';

    const invariants: Array<{ stateId: string; meaning: string }> = graph.states.map((s) => ({
      stateId: s.id,
      meaning: `State ${s.id} (${s.label}): ${
        s.isAccept
          ? `Accept state: Tracks an ${targetParity} count of '${symbol}'s encountered so far.`
          : `Non-accept state: Tracks an ${targetParity === 'even' ? 'odd' : 'even'} count of '${symbol}'s.`
      }`,
    }));

    return {
      question,
      languageDescription: `L = { w ∈ {0,1}* | the total count of symbol '${symbol}' in w is ${targetParity} }`,
      summary: `This DFA computes parity modulo 2 for occurrences of '${symbol}'. Transitioning on symbol '${symbol}' toggles between states, while reading other symbols stays in the current state.`,
      stateInvariants: invariants,
      transitionLogic: `Reading symbol '${symbol}' flips the state between count parity classes. Reading non-target symbols preserves current count state.`,
      acceptanceCriteria: `A string is accepted if computation ends in ${acceptListStr}, representing an ${targetParity} total count of '${symbol}'.`,
      theoreticalInsight: `Counting modulo m requires exactly m states per tracked symbol. Product construction combines parities of multiple symbols if required.`,
      acceptedExamples: targetParity === 'even' ? ['', symbol + symbol, '1' + symbol + '1' + symbol] : [symbol, symbol + symbol + symbol],
      rejectedExamples: targetParity === 'even' ? [symbol, '0' + symbol + '0'] : ['', symbol + symbol],
      isAI: false,
      aiModelUsed: 'Rule-Based Engine (Question-Specific)',
    };
  }

  // 3. Suffix / Ends With Pattern (e.g., Ending with 101)
  if (qLower.includes('ending with') || qLower.includes('ends with')) {
    const patternMatch = question.match(/([01]+)/);
    const pattern = patternMatch ? patternMatch[1] : '101';

    const invariants: Array<{ stateId: string; meaning: string }> = graph.states.map((s, idx) => ({
      stateId: s.id,
      meaning: `State ${s.id} (${s.label}): ${
        s.isAccept
          ? `Accept State: Full suffix pattern "${pattern}" has been matched at the end of the input.`
          : s.isStart
          ? `Start State: No matching prefix of "${pattern}" currently active.`
          : `Prefix State: Represents matching the first ${idx} symbol(s) of suffix "${pattern}".`
      }`,
    }));

    return {
      question,
      languageDescription: `L = { w ∈ {0,1}* | w ends with suffix "${pattern}" }`,
      summary: `This DFA matches suffix pattern "${pattern}". It moves forward state by state as matching characters are read, and fall back to the longest valid prefix when a mismatched symbol arrives.`,
      stateInvariants: invariants,
      transitionLogic: `Reading matching character advances progress towards suffix "${pattern}". Reading an unexpected character jumps back to the longest overlapping prefix.`,
      acceptanceCriteria: `Input string w is accepted if final state is in ${acceptListStr}, indicating string ends with "${pattern}".`,
      theoreticalInsight: `A DFA searching for suffix P of length m requires m + 1 states. State transitions mirror the Knuth-Morris-Pratt (KMP) failure function.`,
      acceptedExamples: [pattern, '0' + pattern, '11' + pattern],
      rejectedExamples: ['0', '1', pattern.slice(0, -1)],
      isAI: false,
      aiModelUsed: 'Rule-Based Engine (Question-Specific)',
    };
  }

  // 4. Substring / Contains Pattern
  if (qLower.includes('contains') || qLower.includes('containing')) {
    const patternMatch = question.match(/([01]+)/);
    const pattern = patternMatch ? patternMatch[1] : '110';

    const invariants: Array<{ stateId: string; meaning: string }> = graph.states.map((s) => ({
      stateId: s.id,
      meaning: `State ${s.id} (${s.label}): ${
        s.isAccept
          ? `Accept State: Target substring "${pattern}" has been found. Remains in this state for all remaining symbols.`
          : s.isStart
          ? `Start State: Searching for start of substring "${pattern}".`
          : `Matching State: Partial match of substring "${pattern}" detected.`
      }`,
    }));

    return {
      question,
      languageDescription: `L = { w ∈ {0,1}* | w contains substring "${pattern}" }`,
      summary: `This DFA scans the input string for substring "${pattern}". Once the substring is completed, it transitions to an accepting trap state from which it never leaves.`,
      stateInvariants: invariants,
      transitionLogic: `Matching characters advance along the pattern path. When the entire pattern "${pattern}" is matched, the DFA transitions to accept state ${acceptListStr}.`,
      acceptanceCriteria: `Accepted if computation reaches state set ${acceptListStr} at any point and stays there.`,
      theoreticalInsight: `Pattern searching DFAs utilize an accepting trap state (sink state) because containing a substring is a monotonic property (once satisfied, remains satisfied).`,
      acceptedExamples: [pattern, '00' + pattern + '11', '1' + pattern],
      rejectedExamples: ['0', '1', '000'],
      isAI: false,
      aiModelUsed: 'Rule-Based Engine (Question-Specific)',
    };
  }

  // 5. Default Generic Question Breakdown (Always specific to graph states and question)
  // Compound / Union / Intersection Pattern (e.g., Starts 10 or Ends 01)
  if (qLower.includes(' or ') || qLower.includes(' and ')) {
    const isOr = qLower.includes(' or ');
    const opStr = isOr ? 'OR' : 'AND';
    const invariants: Array<{ stateId: string; meaning: string }> = graph.states.map((s) => ({
      stateId: s.id,
      meaning: `State ${s.id} (${s.label}): ${
        s.isAccept
          ? `Accept State: Input satisfies ${isOr ? 'at least one of the conditions in' : 'both conditions in'} "${question}".`
          : s.isStart
          ? `Start State: Initial state tracking combined constraints.`
          : `State representing combined state pair tracking prefix/suffix progress.`
      }`,
    }));

    return {
      question,
      languageDescription: `L = { w ∈ {0,1}* | ${question} }`,
      summary: `This minimal ${graph.type} is constructed using Product Construction (${opStr}) and Hopcroft minimization to compute the ${isOr ? 'union' : 'intersection'} of conditions: "${question}".`,
      stateInvariants: invariants,
      transitionLogic: `Transitions track progress for both component language conditions simultaneously in a minimal state space.`,
      acceptanceCriteria: `A string is accepted if final state is in ${acceptListStr}, satisfying the boolean ${opStr} combination of sub-conditions.`,
      theoreticalInsight: `Regular languages are closed under Boolean operations (Union, Intersection). Product construction on DFAs with M and N states generates up to M×N states, minimized to minimal state representation.`,
      acceptedExamples: ['10', '01', '100', '1101'],
      rejectedExamples: ['0', '1', '11', '00'],
      isAI: false,
      aiModelUsed: 'Rule-Based Engine (Question-Specific)',
    };
  }

  const invariants: Array<{ stateId: string; meaning: string }> = graph.states.map((s) => ({
    stateId: s.id,
    meaning: `State ${s.id} (${s.label}): ${
      s.isStart
        ? `Initial Start State '${startState}'. Computation begins here.`
        : s.isAccept
        ? `Accept State. Input satisfies condition for question "${question}".`
        : `Intermediate state representing specific computation condition.`
    }`,
  }));

  return {
    question,
    languageDescription: `Language defined by prompt: "${question}" over alphabet {${(graph.alphabet || ['0', '1']).join(', ')}}`,
    summary: `Automaton with ${graph.states.length} states and ${graph.transitions.length} transitions designed to evaluate language condition: "${question}".`,
    stateInvariants: invariants,
    transitionLogic: `Transitions route input symbols through state transitions to track properties required by "${question}".`,
    acceptanceCriteria: `Input string is accepted if final state belongs to accept set ${acceptListStr}.`,
    theoreticalInsight: `This ${graph.type} uses ${graph.states.length} states to partition all input strings into Myhill-Nerode equivalence classes for "${question}".`,
    acceptedExamples: ['101', '0101'],
    rejectedExamples: ['000', '111'],
    isAI: false,
    aiModelUsed: 'Rule-Based Engine (Question-Specific)',
  };
}

/**
 * Calls AI LLM models using available API Keys (Gemini, Groq, OpenRouter) to generate a rich,
 * question-specific explanation for the automaton.
 */
export async function fetchAIQuestionExplanation(
  question: string,
  graph: AutomatonGraph,
  apiKeys?: APIKeys,
  preferredProvider: AIProvider = 'AUTO'
): Promise<QuestionAIExplanation> {
  const keys = apiKeys || loadAPIKeys();

  const systemPrompt = `You are a Theory of Computation professor.
The user is inspecting a ${graph.type} automaton for the specific problem/question: "${question}".

Automaton Graph Specification:
- Type: ${graph.type}
- Prompt/Question: "${question}"
- Alphabet: [${(graph.alphabet || ['0', '1']).join(', ')}]
- Start State: ${graph.states.find((s) => s.isStart)?.id || 'q0'}
- Accept States: [${graph.states.filter((s) => s.isAccept).map((s) => s.id).join(', ')}]
- States: ${JSON.stringify(graph.states.map((s) => ({ id: s.id, label: s.label || s.id, isStart: s.isStart, isAccept: s.isAccept })))}
- Transitions: ${JSON.stringify(graph.transitions.map((t) => ({ from: t.source, to: t.target, symbols: t.symbols })))}

Task: Generate a detailed, rigorous, question-specific explanation for THIS exact question ("${question}") and THIS automaton. Explain state invariants, language rules, transitions, and Myhill-Nerode insights for THIS problem.

Return ONLY valid JSON matching this schema:
{
  "languageDescription": "Formal definition of the language L accepted (e.g. L = { w ∈ {0,1}* | ... })",
  "summary": "Clear 2-3 sentence overview explaining how this specific automaton solves the question.",
  "stateInvariants": [
    { "stateId": "q0", "meaning": "Detailed invariant for state q0 in the context of this question" }
  ],
  "transitionLogic": "Detailed explanation of transition behavior for input symbols under this question's rules.",
  "acceptanceCriteria": "Exact condition under which a string reaches an accept state.",
  "theoreticalInsight": "Key theoretical insight or Myhill-Nerode equivalence class theorem for this specific language.",
  "acceptedExamples": ["10", "110", "010"],
  "rejectedExamples": ["01", "100", "00"]
}`;

  const availableProviders: Array<{ id: string; name: string; key: string; caller: () => Promise<QuestionAIExplanation> }> = [];

  // 1. Gemini Call
  if (keys.gemini) {
    availableProviders.push({
      id: 'GEMINI',
      name: 'Gemini 1.5 Flash',
      key: keys.gemini,
      caller: async () => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keys.gemini}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: `Explain the automaton for question: "${question}"` }], role: 'user' }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2000,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(`Gemini Error ${res.status}: ${(err as any)?.error?.message || res.statusText}`);
        }

        const data = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(extractJSON(raw));
        return {
          question,
          ...parsed,
          isAI: true,
          aiModelUsed: 'Gemini 1.5 Flash',
        };
      },
    });
  }

  // 2. Groq Call
  if (keys.groq) {
    availableProviders.push({
      id: 'GROQ',
      name: 'Groq (Llama 3.3 70B)',
      key: keys.groq,
      caller: async () => {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${keys.groq}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Explain the automaton for question: "${question}"` },
            ],
            temperature: 0.2,
            max_tokens: 2000,
            response_format: { type: 'json_object' },
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(`Groq Error ${res.status}: ${(err as any)?.error?.message || res.statusText}`);
        }

        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(extractJSON(raw));
        return {
          question,
          ...parsed,
          isAI: true,
          aiModelUsed: 'Groq Llama 3.3 70B',
        };
      },
    });
  }

  // 3. OpenRouter Call
  if (keys.openrouter) {
    availableProviders.push({
      id: 'OPENROUTER',
      name: 'OpenRouter (GPT-4o Mini)',
      key: keys.openrouter,
      caller: async () => {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${keys.openrouter}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Automata Studio',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Explain the automaton for question: "${question}"` },
            ],
            temperature: 0.2,
            max_tokens: 2000,
            response_format: { type: 'json_object' },
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(`OpenRouter Error ${res.status}: ${(err as any)?.error?.message || res.statusText}`);
        }

        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(extractJSON(raw));
        return {
          question,
          ...parsed,
          isAI: true,
          aiModelUsed: 'OpenRouter GPT-4o Mini',
        };
      },
    });
  }

  // Sort providers based on preferredProvider if specified
  const normPref = String(preferredProvider).toUpperCase();
  availableProviders.sort((a, b) => {
    if (a.id === normPref) return -1;
    if (b.id === normPref) return 1;
    return 0;
  });

  // Execute providers in sequence
  for (const provider of availableProviders) {
    try {
      return await provider.caller();
    } catch (e) {
      console.warn(`[AI Explanation] Provider ${provider.name} failed:`, e);
    }
  }

  // Fallback to deterministic question-based generator if AI calls fail or no keys
  return generateDeterministicQuestionExplanation(question, graph);
}
