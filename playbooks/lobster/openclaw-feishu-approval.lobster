name: openclaw-feishu-approval

args:
  gateway_url:
    default: http://127.0.0.1:18789
  channel:
    default: feishu
  target:
    default: ou_demo_target
  message:
    default: OpenClaw x Lobster smoke test
  dry_run:
    default: true

steps:
  - id: draft
    env:
      OC_CHANNEL: ${channel}
      OC_TARGET: ${target}
      OC_MESSAGE: ${message}
      OC_DRY_RUN: ${dry_run}
    command: >-
      node -e 'console.log(JSON.stringify({
        channel: process.env.OC_CHANNEL,
        target: process.env.OC_TARGET,
        message: process.env.OC_MESSAGE,
        dryRun: process.env.OC_DRY_RUN !== "false"
      }))'

  - id: approve
    env:
      OC_PREVIEW_JSON: $draft.json
    command: >-
      node -e 'const draft = JSON.parse(process.env.OC_PREVIEW_JSON);
      console.log(JSON.stringify({
        prompt: "Send " + (draft.dryRun ? "a dry run" : "a real message") + " to " + draft.channel + ":" + draft.target + "?",
        items: [draft],
        preview: draft.message
      }))'
    approval: required

  - id: send
    when: $approve.approved
    env:
      CLAWD_URL: ${gateway_url}
      OC_ARGS_JSON: $draft.json
    command: >-
      node -e 'const { spawnSync } = require("node:child_process");
      const pipeline = "clawd.invoke --tool message --action send --args-json " + JSON.stringify(process.env.OC_ARGS_JSON);
      const result = spawnSync("lobster", ["run", "--mode", "tool", pipeline], {
        encoding: "utf8",
        env: process.env
      });
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      process.exit(result.status ?? 1);'
