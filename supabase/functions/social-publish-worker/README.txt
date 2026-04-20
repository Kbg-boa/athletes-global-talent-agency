Invoke this function on a schedule (every 1-5 minutes) to process queued/failed publication jobs.

Payload example:
{
  "limit": 25
}

This worker calls social-publish with action=retry_due and executes retry/backoff logic.
