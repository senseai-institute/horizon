# Horizon runtime

The half of Horizon that lives in your data centre. It holds the model and the
tools; the workstation in the browser never sees a key.

```bash
cd runtime
npm install
ANTHROPIC_API_KEY=sk-ant-... npm start        # or `ant auth login` first and omit the key
```

Then in the workstation: **System → Runtime**, enter `http://localhost:8787`,
switch *Use runtime* on. Chats now go to the model; the local scripted
provider is the fallback whenever the runtime is unreachable.

## Contract

`POST /chat` with `{ agent, messages, context }` returns `{ text, actions, model }`.
Each action is a tool the model wanted to call, converted to the effect shape
the workstation already knows how to apply — a goal, a trade, an earmark, a
roadmap, journey pieces, or a note. Nothing is applied here. The person clicks
it in the chat window; money-moving actions then go through the review queue.

To point it at a local model instead, replace the `chat()` function with a
call to whatever serves it and keep the response shape.
