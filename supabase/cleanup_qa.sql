-- Review before running. Deletes only clearly labeled QA test records.
-- This permanently deletes matching signups through the event cascade.

begin;

delete from public.events
where club_name ilike 'QA Test%'
   or event_name ilike 'QA %'
   or event_name ilike '%XSS%'
   or event_name ilike '%Capacity%Test%'
   or event_name ilike '%Dedup%Test%';

commit;

-- Verify remaining QA-like records:
select id, club_name, event_name, created_at
from public.events
where club_name ilike 'QA Test%'
   or event_name ilike 'QA %'
   or event_name ilike '%XSS%';
