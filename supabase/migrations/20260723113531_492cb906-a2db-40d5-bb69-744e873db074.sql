
UPDATE public.email_threads
SET
  temperature = 'cold',
  priority = 'cold',
  category = CASE WHEN category = 'spam' THEN category ELSE 'out_of_office' END
WHERE
  (temperature = 'hot' OR priority = 'hot')
  AND COALESCE(meta->>'manual_status', '') = ''
  AND COALESCE(meta->>'manual_temperature', '') = ''
  AND (
    subject ~* '^(auto(matic)?[- ]?reply|out of office|on leave|auto:|re: automatic reply)'
    OR (COALESCE(subject,'') || ' ' || COALESCE(last_body,'')) ~* 'this is an auto(matic)?[- ]?reply|automatic reply|auto[- ]?generated|do[- ]?not[- ]?reply|out of (the )?office|on vacation|on (annual|sick|medical|maternity|paternity) leave|\mooo\M|away from (my |the )?(office|desk)|will be (back|out|away)|currently (out|away|unavailable)|no longer (with|works)'
  );
