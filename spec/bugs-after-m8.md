# Bugs

## Modify File Not Working

The agent seems to be stuck in a loop where it proposes an edit, but the "new content" seems empty. I tried both editing a file and creating a new file and neither worked. I was running in "prod" mode so didn't see if there was an error. Approving does nothing (agent retries) and rejecting with the comment to write to a new file rather than the existing file showed the same behavior.

I don't know if there's logs anywhere when running in prod mode. That makes debugging hard
