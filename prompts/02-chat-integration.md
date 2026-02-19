Complete the chat API route with scoring integration.

File: app/api/chat/route.ts

Requirements:

1. Import and use the scoring system from lib/scoring.ts
2. Score each user message before sending to the doorman Claude
3. Store scores in message.metadata as JSONB
4. Use scores to inform the decision (but let doorman Claude make final call)
5. Track conversation state properly:
   - Create conversation on first message
   - Link all messages to conversation_id
   - Update conversation.status based on outcome

Flow:

1. User sends message → Save to DB
2. Score the message → Store in metadata
3. Send to doorman Claude with full context
4. Get response → Save to DB
5. Check for pass ("Yeah. Here.") or fail ("REDIRECT")
6. Update conversation status accordingly

Edge cases to handle:

- Session doesn't exist yet
- Database write fails
- Claude API times out
- Multiple rapid messages from same user

Use the Vercel AI SDK streaming approach but ensure DB writes happen correctly.
