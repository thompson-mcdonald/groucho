Implement the message scoring system in lib/scoring.ts.

Requirements:

- Score user messages on three dimensions (0-1 scale):

  1. Specificity: Generic terms ("music", "culture") = low, specific references ("Boiler Room", "Fabric 2016 closure") = high
  2. Authenticity: Corporate/buzzword language = low, personal experience = high
  3. Cultural depth: Surface appreciation = low, understanding what's at stake = high

- Use Claude API with a scoring-specific system prompt
- Return structured JSON: {specificity: number, authenticity: number, cultural_depth: number, overall: number}
- Overall = weighted average (you decide weights based on what matters most)

Context:

- This is for filtering people who understand cultural commodification
- We're testing values alignment, not knowledge
- The conversation is 3-4 exchanges, so scoring needs to work with limited context

Implementation approach:

- Create a separate Claude API call specifically for scoring
- Pass the user's message + conversation history
- Extract scores from Claude's response
- Handle errors gracefully (default to neutral scores if API fails)

File: lib/scoring.ts
