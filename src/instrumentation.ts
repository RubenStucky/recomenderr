export async function register() {
  // Only run the sync scheduler on the server (not edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const intervalHours = Number(process.env.SYNC_INTERVAL_HOURS || "6");
    if (intervalHours <= 0) {
      console.log("[auto-sync] Disabled (SYNC_INTERVAL_HOURS=0)");
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;
    console.log(
      `[auto-sync] Scheduling automatic sync every ${intervalHours}h`
    );

    // Delay first run by 30s to let the server fully start
    setTimeout(() => {
      runSyncForAllUsers();
      setInterval(runSyncForAllUsers, intervalMs);
    }, 30_000);
  }
}

async function runSyncForAllUsers() {
  try {
    // Dynamic imports so these only load on the server
    const { getUsers } = await import("./lib/tautulli");
    const { syncAndGenerate } = await import("./lib/recommender");

    const users = await getUsers();
    console.log(
      `[auto-sync] Starting sync for ${users.length} user(s)…`
    );

    for (const user of users) {
      try {
        const result = await syncAndGenerate(user.userId);
        console.log(
          `[auto-sync] Synced ${user.username}: ${result.itemsProcessed} items`
        );
      } catch (err) {
        console.error(
          `[auto-sync] Failed for ${user.username}:`,
          err
        );
      }
    }

    console.log("[auto-sync] All users synced.");
  } catch (err) {
    console.error("[auto-sync] Sync cycle failed:", err);
  }
}
