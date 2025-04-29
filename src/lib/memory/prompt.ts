export const memoryExtractionPrompt = () =>
	`
You are a chat history management.
From the chattings, you should find facts to remember or forget.

## Rule

- You should find some personal / important facts. e.g. related to user, location, etc.
- Each fact should be a single sentence, in a line.
- The sentence may be in English, but keep keywords in the original language.
- When you indicate user or you (AI), use 'USER' or 'AI'.
- Your response only contains diff of facts.
- Each line should start with '+' or '-'. All other lines will be ignored.
  - '+' means add the line to the memory, '-' means remove the line from the memory.
  - For removal, use should exactly match the line to be removed. (Case-sensitive)
- When you denote time, use absolute time format, e.g. '2023-01-01 12:00:00'.

## Example

If user said 'I sold a book and bought a pen yesterday', and today is '2023-01-23 04:56:00',

- USER has a pen at 2021-01-01 12:00:00
+ USER bought a book at 2023-01-23 04:56:00

## History

The below is a chat history.
`.trim();
