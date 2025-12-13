// ORIGINAL: function

function createLogger(name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const logFile = pathModule.join(CONFIG.PATHS.LOGS, `${name}_${timestamp}.log`);
  const startTime = Date.now();

  fs.mkdir(CONFIG.PATHS.LOGS, { recursive: true }).catch(() => { });

  const write = (level: string, phase: string, msg: string, meta?: any) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour12: false });
    const elapsed = Date.now() - startTime;

    const emoji = level === "ERROR" ? "❌" : level === "WARNING" ? "⚠️" :
      level === "SUCCESS" ? "✅" : "ℹ️";
    const color = level === "ERROR" ? "\x1b[31m" : level === "WARNING" ? "\x1b[33m" :
      level === "SUCCESS" ? "\x1b[32m" : "\x1b[36m";
    const reset = "\x1b[0m";

    console.log(`${emoji} ${color}[${phase}]${reset} [${timeStr}] ${msg}`);

    const entry = JSON.stringify({
      timestamp: now.toISOString(),
      level,
      phase,
      msg,
      meta,
      elapsed,
    });
    fs.appendFile(logFile, entry + "\n", "utf8").catch(() => { });
  };

  return {
    init: async () => {
      try {
        await fs.access(CONFIG.PATHS.LOGS, fsConstants.W_OK);
      } catch {
        console.error(`❌ ERROR: Cannot write to log directory: ${CONFIG.PATHS.LOGS}`);
      }
    },
    info: (phase: string, msg: string, meta?: any) => write("INFO", phase, msg, meta),
    success: (phase: string, msg: string, meta?: any) => write("SUCCESS", phase, msg, meta),
    warn: (phase: string, msg: string, meta?: any) => write("WARNING", phase, msg, meta),
    error: (phase: string, msg: string, meta?: any) => write("ERROR", phase, msg, meta),
  };
}
