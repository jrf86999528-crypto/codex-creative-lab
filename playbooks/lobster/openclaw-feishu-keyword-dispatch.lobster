name: openclaw-feishu-keyword-dispatch

args:
  gateway_url:
    default: http://127.0.0.1:18789
  channel:
    default: feishu
  raw:
    default: help

steps:
  - id: parse
    env:
      OC_CHANNEL: ${channel}
      OC_RAW: ${raw}
    command: >-
      node -e 'const raw = (process.env.OC_RAW || "").trim();
      const channel = process.env.OC_CHANNEL || "feishu";
      const help = {
        ok: true,
        kind: "help",
        usage: [
          "/lobster help",
          "/lobster dryrun <target> <message>",
          "/lobster send <target> <message>"
        ],
        note: "dryrun 只校验 payload，不真正发送。send 会真实调用 OpenClaw message.send。"
      };
      if (!raw || raw === "help") {
        console.log(JSON.stringify(help));
        process.exit(0);
      }
      const match = raw.match(/^(dryrun|send)\s+(\S+)\s+([\s\S]+)$/i);
      if (!match) {
        console.log(JSON.stringify({
          ok: false,
          kind: "usage_error",
          error: "Unsupported lobster keyword command",
          ...help
        }));
        process.exit(0);
      }
      const action = match[1].toLowerCase();
      const target = match[2];
      const message = match[3].trim();
      console.log(JSON.stringify({
        ok: true,
        kind: "send_request",
        channel,
        target,
        message,
        dryRun: action === "dryrun"
      }));'

  - id: deliver
    env:
      CLAWD_URL: ${gateway_url}
      OC_PARSED_JSON: $parse.json
    command: >-
      node -e 'const parsed = JSON.parse(process.env.OC_PARSED_JSON);
      if (parsed.kind !== "send_request") {
        console.log(JSON.stringify(parsed));
        process.exit(0);
      }
      const { spawnSync } = require("node:child_process");
      const toolArgs = JSON.stringify({
        channel: parsed.channel,
        target: parsed.target,
        message: parsed.message,
        dryRun: parsed.dryRun
      });
      const pipeline = "clawd.invoke --tool message --action send --args-json " + JSON.stringify(toolArgs);
      const result = spawnSync("lobster", ["run", "--mode", "tool", pipeline], {
        encoding: "utf8",
        env: process.env
      });
      if (result.status !== 0) {
        console.log(JSON.stringify({
          ok: false,
          kind: "dispatch_error",
          request: parsed,
          error: (result.stdout || result.stderr || "unknown lobster error").trim()
        }));
        process.exit(0);
      }
      const envelope = JSON.parse(result.stdout);
      const first = Array.isArray(envelope.output) ? envelope.output[0] : null;
      const details = first && typeof first === "object" ? (first.details ?? null) : null;
      console.log(JSON.stringify({
        ok: true,
        kind: "dispatch_result",
        request: parsed,
        delivery: details
      }));'
