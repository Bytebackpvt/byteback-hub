## What I found
- The latest invite row exists for `chitra@byteback.co.in` and the email send log says the latest invite email was sent successfully.
- The screenshot says `/invite/...` is loading as “Invite not found”, so the problem is in the invite preview/accept flow, not domain verification.
- `chitra@byteback.co.in` already has a profile in the app. The current invite code has a split path: existing users may be directly added, while invite links depend on `workspace_invites`. This can create confusing/invalid invite-link behavior.

## Plan
1. **Make invite lookup more robust**
   - Update the public invite preview to return clear states: valid invite, already accepted, already a workspace member, or invalid/revoked.
   - Keep token-based lookup as the primary path, but make error messages accurate instead of generic “Invite not found”.

2. **Fix inviting existing users**
   - If the invited email already belongs to an app user, keep the invite email behavior consistent:
     - add them to the workspace when appropriate, and
     - email them a “You’ve been added / open workspace” link instead of sending a broken accept-token experience.

3. **Show/copy the real invite link in Team page**
   - Include the invite token in pending invites returned by the backend.
   - Add a “Copy link” action beside pending invites so if delivery is delayed/spam-filtered, you can send the exact working link manually.

4. **Improve invite email reliability and messaging**
   - Ensure the invite email always uses the correct public app domain.
   - Add plain-text invite copy explicitly instead of relying only on HTML fallback.

5. **Validate after implementation**
   - Check the latest invite token opens the invite page.
   - Check that the team page shows pending invite state and copy-link action.
   - Re-check email send log for the new invite attempt.