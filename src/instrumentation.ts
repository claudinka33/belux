export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { dbReady } = await import("./lib/db");
    await dbReady();
  }
}
