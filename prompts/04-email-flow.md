Implement the complete email collection flow.

Files:

- app/doorcheck/access/page.tsx (form UI)
- app/api/access/route.ts (submission handler)

Requirements:

**Frontend (access/page.tsx):**

1. Simple email input form
2. Validate email format client-side
3. Show loading state during submission
4. Success state: "Noted. We'll be in touch."
5. Error handling if submission fails
6. Maintain black/white minimal aesthetic

**Backend (api/access/route.ts):**

1. Verify session has a passed conversation
2. Create or upsert profile with email
3. Create profile_eligibility record linking profile to conversation
4. Return success/error appropriately
5. Handle edge cases:
   - No passed conversation found
   - Email already in system (should still succeed)
   - Database write fails

Security considerations:

- Rate limit email submissions
- Validate email format server-side
- Don't expose whether email already exists
- Use service_role key for DB writes

The flow should feel seamless - pass the test, give email, done. No friction beyond what's necessary.
