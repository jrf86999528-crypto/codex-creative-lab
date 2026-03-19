# Lobster Workflows For OpenClaw

This folder contains a minimal Lobster workflow that talks back to a local OpenClaw gateway through `clawd.invoke`.

## Included example

- `openclaw-feishu-approval.lobster`
  - Builds a `message.send` payload for OpenClaw
  - Shows a human approval gate before sending
  - Defaults to `dry_run=true` so the first run is safe
- `openclaw-feishu-keyword-dispatch.lobster`
  - Accepts `/lobster` style keyword commands from chat
  - Supports `help`, `dryrun`, and `send`
  - Sends through OpenClaw's `message.send`

## Prerequisites

1. OpenClaw gateway is running on `http://127.0.0.1:18789`
2. Export a gateway token for `clawd.invoke`

```bash
export CLAWD_URL="http://127.0.0.1:18789"
export CLAWD_TOKEN="$(openclaw dashboard --no-open | grep -o 'token=[^[:space:]]*' | cut -d= -f2)"
```

## Run From The Host CLI

This is the safest smoke test because it stays in dry-run mode:

```bash
lobster run --file /Users/a123/Documents/codex/playbooks/lobster/openclaw-feishu-approval.lobster \
  --args-json '{"target":"ou_test_target","message":"Hello from Lobster"}'
```

When the approval prompt appears, answer `y` to continue. Because `dry_run` defaults to `true`, OpenClaw will validate the payload without sending a real message.

To send for real, override `dry_run`:

```bash
lobster run --file /Users/a123/Documents/codex/playbooks/lobster/openclaw-feishu-approval.lobster \
  --args-json '{"target":"ou_real_target","message":"Hello from Lobster","dry_run":false}'
```

## Trigger From OpenClaw's Lobster Tool

OpenClaw's built-in Lobster plugin currently runs inline pipelines, not workflow files directly. The practical pattern is to shell out to the host CLI from the Lobster tool.

First call, which returns an approval token:

```text
action=run
pipeline=exec --json --shell 'lobster run --mode tool --file /Users/a123/Documents/codex/playbooks/lobster/openclaw-feishu-approval.lobster --args-json "{\"target\":\"ou_test_target\",\"message\":\"Hello from OpenClaw\"}"' | json
```

Second call, after you extract `requiresApproval.resumeToken` from the first result:

```text
action=run
pipeline=exec --json --shell 'lobster resume --token "<resume-token>" --approve yes' | json
```

That keeps the workflow definition in a versioned `.lobster` file while still letting an OpenClaw agent drive it through the Lobster tool.

## Keyword Dispatch Workflow

This variant is designed for chat messages that start with `/lobster`.

Host CLI examples:

```bash
lobster run --file /Users/a123/Documents/codex/playbooks/lobster/openclaw-feishu-keyword-dispatch.lobster \
  --args-json '{"raw":"help"}'
```

```bash
lobster run --file /Users/a123/Documents/codex/playbooks/lobster/openclaw-feishu-keyword-dispatch.lobster \
  --args-json '{"raw":"dryrun ou_test_target Hello from keyword dispatch"}'
```

```bash
lobster run --file /Users/a123/Documents/codex/playbooks/lobster/openclaw-feishu-keyword-dispatch.lobster \
  --args-json '{"raw":"send ou_real_target Hello from keyword dispatch"}'
```

Recommended chat syntax:

```text
/lobster help
/lobster dryrun ou_xxx 这是一条演练消息
/lobster send ou_xxx 这是一条真实消息
```

Wrapper script for agent/tool execution:

```bash
/Users/a123/Documents/codex/scripts/run_openclaw_lobster_keyword.sh 'dryrun ou_xxx 这是一条演练消息'
```
