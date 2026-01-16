# Bugs after M12

## Token Count Seems Off

When the agent was forming questions and reading my answers I am not sure the token count was going up. Also when reading a bunch of files.

## Plan Mode Rendering

Answers to Gary's questions aren't visible in the chat. They should be - even if for this version we shouldn't be able to edit them, they should be visible (maybe in an expand box?).

Example:

> Let me ask a few questions before we plan something special for him:
> <literally no break here, jumps straight to>
> Oh this is JUICY! I love the family curse angle 

The way we visualize Gary's actions in general is not pretty. Right now it's a single expanding bubble where the AI keeps writing to us. We don't show files read, questions asked, answered, etc. From the UI you wouldn't be able to tell the user is interacting with Gary, even though they are!

## Error: Maximum conversation turns reached

I got this weird error, I'm allowed to respond but it shouldn't happen.

## Stop / Edit

There's no way to stop. There should be a button that kills the request. For now editing a past message is too much, but we should just stop and the user can then correct us in simple text.
