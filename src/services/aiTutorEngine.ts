/**
 * NEXT GENERATION AI TUTOR CONTENT ENGINE
 *
 * Upgrades the AI Tutor Explanation Layer for Theory of Computation.
 * Enforces the strict rule: The Automata Engine is always the source of truth.
 * The AI ONLY explains engine-generated results and NEVER computes them.
 */

export interface AITutorInputContext {
  currentTopic?: string;
  currentOperation: string;
  languageDescriptionA?: string;
  languageDescriptionB?: string;
  automatonStatsA?: { statesCount: number; transitionsCount: number; acceptStatesCount: number };
  automatonStatsB?: { statesCount: number; transitionsCount: number; acceptStatesCount: number };
  automatonStatsResult?: { statesCount: number; transitionsCount: number; acceptStatesCount: number };
  simulationResult: {
    accA: boolean;
    accB: boolean;
    accRes: boolean;
    stateA?: string;
    stateB?: string;
    stateProduct?: string;
  };
  constructionSteps?: string[];
  stateInformation?: string;
  acceptanceStatusText?: string;
  currentString: string;
  generatorUsed?: string;
  mathematicalResults?: {
    booleanExpr?: string;
    opName?: string;
    formalRule?: string;
  };
  nameA?: string;
  nameB?: string;
  tutorStyle: 'beginner' | 'exam' | 'technical' | 'analogy' | 'memory' | 'mistakes' | 'tip';
}

/**
 * Builds system & user prompt for LLMs (Gemini, Groq, OpenRouter, OpenAI)
 * enforcing strict engine rules, input facts, and exact 16-section output format.
 */
export function buildAITutorPrompt(ctx: AITutorInputContext): string {
  const modeWordCounts: Record<string, string> = {
    beginner: '400–700 words (focused on intuitive breakdown and high pedagogical value)',
    exam: '250–500 words (focused on exam structure, scoring rules, and university mark distribution)',
    technical: '600–1200 words (focused on formal proofs, state-space math, and set theory)',
    analogy: '300–600 words (focused on vivid real-world systems and intuitive analogies)',
    memory: '100–200 words (focused on fast mnemonics, quick lookup rules, and memory shortcuts)',
    mistakes: '250–500 words (focused on student anti-patterns, pitfalls, and correction rules)',
    tip: '150–300 words (focused on high-yield university exam shortcuts and speed techniques)',
  };

  const nameA = ctx.nameA || 'DFA A';
  const nameB = ctx.nameB || 'DFA B';
  const inputStr = ctx.currentString !== undefined ? ctx.currentString : 'ε';
  const targetLength = modeWordCounts[ctx.tutorStyle] || '300–600 words';

  return `You are a distinguished University Professor & Expert Theory of Computation Tutor.
Your goal is to teach formal languages, automata, and computational complexity with textbook-level clarity, mathematical precision, and high pedagogical value.

==================================================
STRICT ENGINE RULE
==================================================
The Automata Engine is ALWAYS the source of truth.
You MUST NEVER:
• compute automata
• create states
• generate transitions
• decide acceptance
• minimize DFA
• perform subset construction
• perform ε-closure
• perform product construction
• compute counterexamples

Those are ALREADY computed by the deterministic engine below. You ONLY explain these engine-generated facts.

==================================================
INPUT FACTS PROVIDED BY ENGINE (DO NOT ALTER)
==================================================
- Current Topic: ${ctx.currentTopic || 'Automata Set Operations & DFA Product Construction'}
- Current Operation: ${ctx.currentOperation} (${ctx.mathematicalResults?.opName || ctx.currentOperation})
- Language Description A (${nameA}): ${ctx.languageDescriptionA || 'Defined DFA A'}
- Language Description B (${nameB}): ${ctx.languageDescriptionB || 'Defined DFA B'}
- Automaton Statistics:
  * ${nameA}: ${ctx.automatonStatsA ? `${ctx.automatonStatsA.statesCount} states, ${ctx.automatonStatsA.acceptStatesCount} accept states` : 'Engine computed'}
  * ${nameB}: ${ctx.automatonStatsB ? `${ctx.automatonStatsB.statesCount} states, ${ctx.automatonStatsB.acceptStatesCount} accept states` : 'Engine computed'}
  * Result DFA: ${ctx.automatonStatsResult ? `${ctx.automatonStatsResult.statesCount} states` : 'Engine computed product DFA'}
- Input String Evaluated: "${inputStr}"
- Simulation Result:
  * ${nameA} Decision: ${ctx.simulationResult.accA ? 'ACCEPTED (TRUE)' : 'REJECTED (FALSE)'} (State: ${ctx.simulationResult.stateA || 'q0'})
  * ${nameB} Decision: ${ctx.simulationResult.accB ? 'ACCEPTED (TRUE)' : 'REJECTED (FALSE)'} (State: ${ctx.simulationResult.stateB || 'q0'})
  * Result DFA Decision: ${ctx.simulationResult.accRes ? 'ACCEPTED (TRUE)' : 'REJECTED (FALSE)'} (Product State: ${ctx.simulationResult.stateProduct || '(q0, q0)'})
- Boolean Mathematical Result: ${ctx.mathematicalResults?.booleanExpr || `${ctx.simulationResult.accA ? '1' : '0'} ${ctx.currentOperation} ${ctx.simulationResult.accB ? '1' : '0'} => ${ctx.simulationResult.accRes ? '1' : '0'}`}
- Generator Used: ${ctx.generatorUsed || 'Deterministic Automata Engine'}

==================================================
TEACHING STYLE & TARGET LENGTH
==================================================
Mode Selected: ${ctx.tutorStyle.toUpperCase()}
Target Word Count: ${targetLength}

==================================================
OUTPUT FORMAT REQUIREMENT
==================================================
Replace long plain paragraphs with structured educational sections.
Generate your explanation using EXACTLY the following 16 sections in this order, using standard Markdown headings and formatting:

🧠 Quick Summary
Explain the core idea in 2–3 concise, punchy sentences.

📖 Core Concept
Explain:
• what this operation is
• why it exists
• when it is used
Use simple, clear language.

⚙ Engine Result
Summarize the engine output cleanly using a key-value list or markdown table:
- Operation: ${ctx.currentOperation}
- Input: "${inputStr}"
- ${nameA}: ${ctx.simulationResult.accA ? 'Accepted' : 'Rejected'}
- ${nameB}: ${ctx.simulationResult.accB ? 'Accepted' : 'Rejected'}
- Final Result: ${ctx.simulationResult.accRes ? 'Accepted' : 'Rejected'}
- Rule Used: [Specify the boolean rule used for ${ctx.currentOperation}]

🔍 Step-by-Step Reasoning
Generate numbered steps (Step 1, Step 2, etc.) tracing how the engine evaluated the input "${inputStr}" through the states.

📐 Formal Mathematical Explanation
Generate proper mathematical notation (e.g., L(A ∪ B) = L(A) ∪ L(B), δ((q_A, q_B), a) = (δ_A(q_A, a), δ_B(q_B, a)), Σ = {0, 1}, Q = Q_A × Q_B, F = ...).
Never use plain English only.

EXAMPLES
Generate Accepted Examples and Rejected Examples with reasons explaining WHY each example behaves that way based on the operation logic.

💡 Key Observations
Generate:
• Important property
• Interesting observation
• Common pattern

💡 Did You Know?
Generate one fascinating educational fact (e.g. Closure Properties, Myhill-Nerode, Regular Languages, Hopcroft Algorithm, Subset Construction, Thompson Construction).

🌍 Real World Application
Explain where this concept is used in software engineering & CS (e.g. Regex Engines, Compilers, Firewalls, Packet Filters, Digital Circuits, Lexical Analysis, Pattern Matching).

⚠️ Common Mistakes
Always generate:
- Mistake:
- Why it is wrong:
- Correct approach:
- How to avoid it:

📝 Exam Notes
Generate:
- Frequently Asked Question:
- Expected Answer:
- Marks & Difficulty:
- University Tip:

💡 Memory Trick
Generate:
- Mnemonic:
- Visualization:
- Shortcut:

⏱ Complexity
Display clearly:
- Time Complexity:
- Space Complexity:
- Construction Complexity:
- State Growth:
- Transition Growth:

🔑 Key Takeaways
Finish with 3–5 concise bullet points summarizing the core lessons.

🔗 Related Topics
Suggest related concepts (e.g., Next Learn → Intersection, Complement, Difference, Product Construction, Minimization).

❓ Follow-up Questions
At the end generate 5 suggested follow-up questions for student self-testing.

==================================================
WRITING STYLE GUIDELINES
==================================================
- Professional, university textbook quality.
- Avoid repetition and generic AI fluff.
- Prefer Headings, Tables, Bullet Lists, Numbered Steps, and Mathematical notation.
- Write like a senior computer science professor guiding a student to mastery.`;
}

/**
 * Deterministic Offline Fallback Generator
 * Generates comprehensive, university textbook quality structured explanations
 * matching all 16 required sections when API calls fail or offline.
 */
export function generateOfflineAITutorExplanation(ctx: AITutorInputContext): string {
  const nameA = ctx.nameA || 'DFA A';
  const nameB = ctx.nameB || 'DFA B';
  const inputStr = ctx.currentString !== undefined ? ctx.currentString : 'ε';
  const op = ctx.currentOperation.toUpperCase();
  const accA = ctx.simulationResult.accA;
  const accB = ctx.simulationResult.accB;
  const accRes = ctx.simulationResult.accRes;
  const stA = ctx.simulationResult.stateA || 'q0';
  const stB = ctx.simulationResult.stateB || 'q0';
  const stProd = ctx.simulationResult.stateProduct || `(${stA}, ${stB})`;

  const isAccStr = accRes ? 'ACCEPTED (TRUE)' : 'REJECTED (FALSE)';
  const resBadge = accRes ? '✅ ACCEPTED' : '❌ REJECTED';

  // Operation specific descriptions & rules
  let opTitle = 'Set Operation';
  let opRuleDesc = '';
  let formalMathExpr = '';
  let acceptSetMath = '';
  let memoryMnemonic = '';
  let realWorldApp = '';
  let closureFact = '';

  if (op.includes('UNION') || op === 'OR' || op === 'A ∪ B') {
    opTitle = 'Union (A ∪ B)';
    opRuleDesc = 'Accept if AT LEAST ONE component DFA accepts.';
    formalMathExpr = 'L(A \\cup B) = L(A) \\cup L(B) = \\{ w \\in \\Sigma^* \\mid w \\in L(A) \\lor w \\in L(B) \\}';
    acceptSetMath = 'F_{\\text{Union}} = (F_A \\times Q_B) \\cup (Q_A \\times F_B)';
    memoryMnemonic = 'Union = OR = Generous Gate (If either DFA accepts, the product DFA accepts).';
    realWorldApp = 'Lexical analyzers combining multiple regex pattern tokens; multi-rule firewall policies where match on any rule grants access.';
    closureFact = 'Regular languages are closed under Union. The product construction proves closure constructively by building a single DFA with |Q_A| × |Q_B| states.';
  } else if (op.includes('INTERSECT') || op === 'AND' || op === 'A ∩ B') {
    opTitle = 'Intersection (A ∩ B)';
    opRuleDesc = 'Accept ONLY IF BOTH component DFAs accept simultaneously.';
    formalMathExpr = 'L(A \\cap B) = L(A) \\cap L(B) = \\{ w \\in \\Sigma^* \\mid w \\in L(A) \\land w \\in L(B) \\}';
    acceptSetMath = 'F_{\\text{Intersect}} = F_A \\times F_B';
    memoryMnemonic = 'Intersection = AND = Strict Gate (Both DFAs must simultaneously say YES).';
    realWorldApp = 'Dual-factor security validation, compiler syntax checks requiring both grammar correctness and type validity.';
    closureFact = 'Regular languages are closed under Intersection. De Morgan\'s Law (L_1 ∩ L_2 = (L_1^c ∪ L_2^c)^c) gives an alternate proof of closure.';
  } else if (op.includes('DIFF') || op === 'A \\ B' || op === 'SUBTRACT') {
    opTitle = 'Set Difference (A \\ B)';
    opRuleDesc = 'Accept if DFA A accepts AND DFA B rejects.';
    formalMathExpr = 'L(A \\setminus B) = L(A) \\cap \\overline{L(B)} = \\{ w \\in \\Sigma^* \\mid w \\in L(A) \\land w \\notin L(B) \\}';
    acceptSetMath = 'F_{\\text{Diff}} = F_A \\times (Q_B \\setminus F_B)';
    memoryMnemonic = 'Difference = Exclusive Gate (Accept A, explicitly reject B).';
    realWorldApp = 'Database query filtering (SELECT FROM A WHERE NOT IN B), static analysis finding code matching pattern A but lacking safety check B.';
    closureFact = 'Regular languages are closed under Difference because intersection and complementation are both closed.';
  } else if (op.includes('XOR') || op.includes('SYMMETRIC')) {
    opTitle = 'Symmetric Difference (A ⊕ B)';
    opRuleDesc = 'Accept if EXACTLY ONE component DFA accepts (mismatch condition).';
    formalMathExpr = 'L(A \\oplus B) = (L(A) \\setminus L(B)) \\cup (L(B) \\setminus L(A))';
    acceptSetMath = 'F_{\\text{XOR}} = (F_A \\times (Q_B \\setminus F_B)) \\cup ((Q_A \\setminus F_A) \\times F_B)';
    memoryMnemonic = 'Symmetric Difference = Mnemonic of Disagreement (Accepts when DFAs disagree).';
    realWorldApp = 'Automata equivalence testing (if A ⊕ B accepts any string, A and B are NOT equivalent); digital parity generation.';
    closureFact = 'If L(A ⊕ B) = ∅, then L(A) = L(B). This makes Symmetric Difference the foundation of DFA equivalence algorithms.';
  } else {
    opTitle = `Operation (${op})`;
    opRuleDesc = 'Evaluates component acceptance under the engine-computed operation boolean logic.';
    formalMathExpr = 'L(M_{\\text{Product}}) = \\{ w \\in \\Sigma^* \\mid f(\\delta_A^*(q_{0A}, w) \\in F_A, \\delta_B^*(q_{0B}, w) \\in F_B) = 1 \\}';
    acceptSetMath = 'F_{\\text{Product}} = \\{ (q_A, q_B) \\in Q_A \\times Q_B \\mid f(q_A \\in F_A, q_B \\in F_B) = \\text{TRUE} \\}';
    memoryMnemonic = 'Product Construction = Synchronous Parallel Execution.';
    realWorldApp = 'Model checking and verification of parallel reactive systems.';
    closureFact = 'Product construction demonstrates that combining finite memory machines yields another finite memory machine.';
  }

  // Alternate sample strings for examples
  const sampleAccepted = accRes ? inputStr : '001';
  const sampleRejected = accRes ? (inputStr === '00' ? '111' : '00') : inputStr;

  return `🧠 **Quick Summary**
The ${opTitle} operation constructs a product automaton that tracks state transitions of ${nameA} and ${nameB} concurrently in lockstep. Evaluating input string "${inputStr}" yields **${isAccStr}** based on the engine's deterministic boolean evaluation.

📖 **Core Concept**
• **What it is**: Cartesian Product Construction ($Q = Q_A \\times Q_B$) combining two DFAs into a single joint finite state machine.
• **Why it exists**: To compute complex formal language combinations while preserving determinism ($1$ transition per symbol per state).
• **When it is used**: Whenever a computational system must check multiple language specifications in parallel without backtracking.

⚙ **Engine Result**
- **Operation**: ${opTitle}
- **Input String**: "${inputStr}"
- **${nameA} State**: State \`${stA}\` → ${accA ? 'ACCEPTED (TRUE)' : 'REJECTED (FALSE)'}
- **${nameB} State**: State \`${stB}\` → ${accB ? 'ACCEPTED (TRUE)' : 'REJECTED (FALSE)'}
- **Product State**: State \`${stProd}\`
- **Final Result**: ${resBadge}
- **Rule Used**: ${opRuleDesc}

🔍 **Step-by-Step Reasoning**
1. **Initial State**: Engine initializes both machines at start state pair $(q_{0A}, q_{0B})$.
2. **Transition Execution**: For input string "${inputStr}", symbol-by-symbol transitions run concurrently:
   $$\\delta_A^*(q_{0A}, "${inputStr}") = ${stA}, \\quad \\delta_B^*(q_{0B}, "${inputStr}") = ${stB}$$
3. **Composite State Evaluation**: The engine reaches composite product state \`${stProd}\`.
4. **Acceptance Inspection**:
   - ${nameA} evaluates to **${accA}**.
   - ${nameB} evaluates to **${accB}**.
5. **Final Output**: Applying the boolean rule \`${opRuleDesc}\` to outputs (${accA ? '1' : '0'}, ${accB ? '1' : '0'}) yields **${isAccStr}**.

📐 **Formal Mathematical Explanation**
$$\\begin{aligned}
\\text{Alphabet}: & \\quad \\Sigma = \\{0, 1\\} \\\\
\\text{State Space}: & \\quad Q = Q_A \\times Q_B = \\{ (q_A, q_B) \\mid q_A \\in Q_A, q_B \\in Q_B \\} \\\\
\\text{Transition Function}: & \\quad \\delta((q_A, q_B), a) = (\\delta_A(q_A, a), \\delta_B(q_B, a)) \\\\
\\text{Language Relation}: & \\quad ${formalMathExpr} \\\\
\\text{Accepting Set}: & \\quad ${acceptSetMath}
\\end{aligned}$$

EXAMPLES
• **Accepted Example**: \`${sampleAccepted}\`
  *Reason*: ${accRes ? `String "${inputStr}" evaluated to ${stProd} which belongs to the accepting set ${opTitle}.` : `Satisfies ${opTitle} condition by reaching an accepting state pair.`}
• **Rejected Example**: \`${sampleRejected}\`
  *Reason*: ${!accRes ? `String "${inputStr}" evaluated to state ${stProd} which is in the non-accepting state set.` : `Fails the boolean requirement of ${opTitle}.`}

💡 **Key Observations**
• **Important Property**: The product DFA has exactly $|Q_A| \\times |Q_B|$ total potential states, maintaining strict determinism.
• **Interesting Observation**: Some product states may be unreachable from $(q_{0A}, q_{0B})$ and can be pruned prior to minimization.
• **Common Pattern**: The transition behavior on symbol $a$ depends solely on the individual component transitions $\\delta_A(q_A, a)$ and $\\delta_B(q_B, a)$.

💡 **Did You Know?**
${closureFact}

🌍 **Real World Application**
${realWorldApp}

⚠️ **Common Mistakes**
- **Mistake**: Deciding string acceptance mid-way through execution.
- **Why it is wrong**: DFA acceptance is defined strictly by the state occupied AFTER reading the final symbol.
- **Correct approach**: Process every symbol in the string from left to right before inspecting the acceptance flag.
- **How to avoid it**: Always trace the complete input path $\\delta^*(q_0, w)$ to termination.

📝 **Exam Notes**
- **Frequently Asked Question**: What is the maximum number of states in a product DFA of two DFAs with $n$ and $m$ states?
- **Expected Answer**: $n \\times m$ states. The number of transitions is $n \\cdot m \\cdot |\\Sigma|$.
- **Marks & Difficulty**: 5–10 Marks | Moderate Difficulty.
- **University Tip**: Always write out the formal tuple $(Q, \\Sigma, \\delta, q_0, F)$ explicitly when answering product construction exam questions.

💡 **Memory Trick**
- **Mnemonic**: ${memoryMnemonic}
- **Visualization**: Picture two parallel conveyor belts moving in lockstep under a single sensor.
- **Shortcut**: Evaluate truth table values for component DFAs first, then apply boolean gate logic.

⏱ **Complexity**
- **Time Complexity**: $\\mathcal{O}(|Q_A| \\cdot |Q_B| \\cdot |\\Sigma|)$ for building full product transitions.
- **Space Complexity**: $\\mathcal{O}(|Q_A| \\cdot |Q_B|)$ state memory.
- **Construction Complexity**: $\\mathcal{O}(|Q_A| \\cdot |Q_B| \\cdot |\\Sigma|)$.
- **State Growth**: Multiplicative ($|Q_A| \\times |Q_B|$).
- **Transition Growth**: Multiplicative per alphabet symbol ($|Q_A| \\cdot |Q_B| \\cdot |\\Sigma|$).

🔑 **Key Takeaways**
✓ The Automata Engine executes both DFAs synchronously via Cartesian product construction.
✓ Product state $(q_A, q_B)$ acceptance is determined by evaluating $(q_A \\in F_A, q_B \\in F_B)$ against the ${opTitle} rule.
✓ Regular languages are strictly closed under ${opTitle}.
✓ Unreachable state removal and Hopcroft's minimization can reduce the product DFA state count.

🔗 **Related Topics**
Next Learn → Intersection Construction, DFA Complement, Set Difference, Product State Minimization, Myhill-Nerode Theorem.

❓ **Follow-up Questions**
1. Why does Product Construction require component DFAs to be complete with dead/trap states?
2. How can Product Construction be used to verify if two DFAs recognize identical languages?
3. Can the product DFA contain unreachable states, and how are they systematically removed?
4. How does the size of the alphabet $|\\Sigma|$ affect the transition density of the product DFA?
5. What is the relationship between Set Difference $A \\setminus B$ and Intersection with Complement $A \\cap \\overline{B}$?`;
}
