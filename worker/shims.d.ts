declare module "../.open-next/worker.js" {
  import type { Env } from "./env";

  export const DOQueueHandler: unknown;
  export const DOShardedTagCache: unknown;
  export const BucketCachePurge: unknown;

  const handler: {
    fetch: (
      request: Request,
      env: Env,
      ctx: ExecutionContext,
    ) => Response | Promise<Response>;
  };

  export default handler;
}
