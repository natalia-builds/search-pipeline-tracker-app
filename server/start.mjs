// Starts the local server from code, so other code (the command line today, a desktop window
// later) can run it without copying how it is set up.
import { createApp } from "./app.mjs";

/**
 * Builds the server and starts listening on 127.0.0.1 (this computer only).
 *  - port: the port to use. 0 (the default) asks the computer for any free port.
 *  - dataDir: the folder that holds the SQLite file.
 *  - distDir: the folder holding the built app (the files in dist/).
 * Resolves to `{ server, port, close }`: `port` is the port actually in use, and `close()`
 * stops the server (and closes the database). Rejects if the port can't be used, for example
 * when something else already holds it (`error.code === "EADDRINUSE"`).
 */
export function startServer({ port = 0, dataDir, distDir }) {
  const server = createApp({ dataDir, distDir });
  return new Promise((resolve, reject) => {
    const failed = (error) => {
      server.close(() => {}); // release the database that createApp opened
      reject(error);
    };
    server.once("error", failed);
    // 127.0.0.1 means "this computer only". Don't change this.
    server.listen(port, "127.0.0.1", () => {
      server.off("error", failed);
      let closing;
      // Safe to call more than once: every call waits for the same shutdown.
      const close = () => (closing ??= new Promise((done, fail) => server.close((e) => (e ? fail(e) : done()))));
      resolve({ server, port: server.address().port, close });
    });
  });
}
