import Anthropic from '@anthropic-ai/sdk';

export type Score = {
  specificity: number;
  authenticity: number;
  cultural_depth: number;
  overall: number;
};

export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const NEUTRAL_SCORES: Score = {
  specificity: 0.5,
  authenticity: 0.5,
  cultural_depth: 0.5,
  overall: 0.5,
};

// Cultural depth matters most (understanding what's at stake),
// authenticity second (genuine vs performative), specificity least
// (knowledge doesn't equal values alignment)
const WEIGHTS = {
  specificity: 0.20,
  authenticity: 0.35,
  cultural_depth: 0.45,
} as const;

const SCORING_SYSTEM_PROMPT = `You are a scoring system evaluating messages from people seeking access to a culturally significant community space. You are assessing values alignment—specifically whether someone understands what is at stake in cultural commodification—not their knowledge or vocabulary.

Score each message on three dimensions from 0.0 to 1.0:

**SPECIFICITY** — Does the person reference specific, concrete things?
- 0.0–0.3: Only generic terms ("music", "culture", "the scene", "underground")
- 0.3–0.7: Named genres, general venue types, vague references to places or periods
- 0.7–1.0: Specific venues (Fabric, Berghain, Boiler Room), named events, dates, artists, precise moments (e.g., "Fabric's 2016 closure", "the Battery Park thing")

**AUTHENTICITY** — Does the language feel like genuine personal experience or performance?
- 0.0–0.3: Corporate buzzwords ("curated", "ecosystem", "vibrant community"), marketing language, conspicuous name-dropping without substance, performative enthusiasm
- 0.3–0.7: Mix of genuine and affected—some real experience but filtered through an image
- 0.7–1.0: Honest and personal, specific to their actual experience—even if imperfect or uncertain; emotional truth over status signaling

**CULTURAL_DEPTH** — Does the person understand what is at stake, not just what exists?
- 0.0–0.3: Surface consumption mindset ("I just love music", treating culture as a product to access), no awareness of systemic pressures, sees access as the point
- 0.3–0.7: Some awareness of commodification issues, can name the problem but treats it abstractly or doesn't connect it to their own role
- 0.7–1.0: Genuine understanding of systemic pressures (gentrification, venue closures, tourism's effect on scenes, economic extraction from communities), recognizes the tension between their own participation and preservation, understands that access is not the same as belonging

Consider the full conversation history for context. Score only the applicant's most recent message, informed by the trajectory of the conversation.

Respond with only a JSON object. No commentary, no explanation.
Format: {"specificity": 0.0, "authenticity": 0.0, "cultural_depth": 0.0}`;

const client = new Anthropic();

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export async function scoreMessage(
  message: string,
  history: ConversationMessage[] = []
): Promise<Score> {
  try {
    const messages: Anthropic.MessageParam[] = [
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: `Score this message from the applicant:\n\n${message}`,
      },
    ];

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system: SCORING_SYSTEM_PROMPT,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NEUTRAL_SCORES;
    }

    const raw = JSON.parse(textBlock.text);
    const specificity = clamp(Number(raw.specificity));
    const authenticity = clamp(Number(raw.authenticity));
    const cultural_depth = clamp(Number(raw.cultural_depth));
    const overall = clamp(
      specificity * WEIGHTS.specificity +
        authenticity * WEIGHTS.authenticity +
        cultural_depth * WEIGHTS.cultural_depth
    );

    return { specificity, authenticity, cultural_depth, overall };
  } catch (error) {
    console.error('Scoring failed:', error);
    return NEUTRAL_SCORES;
  }
}
