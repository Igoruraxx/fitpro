import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { initTRPC, TRPCError } from '@trpc/server';
import express from 'express';

const t = initTRPC.create();
const appRouter = t.router({
  test: t.procedure.query(async () => {
    throw new Error("This is a test error from the database");
  }),
});

const app = express();
app.use('/api/trpc', createExpressMiddleware({ router: appRouter }));
app.listen(3002, () => console.log('Listening on 3002'));
