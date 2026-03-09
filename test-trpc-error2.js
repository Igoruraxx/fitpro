import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { initTRPC, TRPCError } from '@trpc/server';
import express from 'express';
import superjson from 'superjson';

const t = initTRPC.create({ transformer: superjson });
const appRouter = t.router({
  test: t.procedure.query(async () => {
    throw new Error("This is a test error from the database");
  }),
});

const app = express();
app.use('/api/trpc', createExpressMiddleware({ router: appRouter }));
app.get('/api/error', (req, res) => res.status(500).json({ message: "Erro interno do servidor. Tente novamente mais tarde." }));
app.listen(3004, () => console.log('Listening on 3004'));
