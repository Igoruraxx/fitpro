const fs = require('fs');
let code = fs.readFileSync('server/jobs.ts', 'utf8');

code = code.replace(
  `      .select({
        txId: transactions.id,
        txAmount: transactions.amount,
        txDueDate: transactions.dueDate,
        txDescription: transactions.description,
        txCategory: transactions.category,
        clientId: transactions.clientId,
        trainerId: transactions.trainerId,
      })
      .from(transactions)`,
  `      .select({
        txId: transactions.id,
        txAmount: transactions.amount,
        txDueDate: transactions.dueDate,
        txDescription: transactions.description,
        txCategory: transactions.category,
        clientId: transactions.clientId,
        clientName: clients.name,
        trainerId: transactions.trainerId,
      })
      .from(transactions)
      .leftJoin(clients, eq(transactions.clientId, clients.id))`
);

code = code.replace(
  `      // Get client name
      let clientName = "Aluno";
      if (tx.clientId) {
        const [cl] = await db
          .select({ name: clients.name })
          .from(clients)
          .where(eq(clients.id, tx.clientId))
          .limit(1);
        if (cl) clientName = cl.name;
      }`,
  `      // Get client name
      const clientName = tx.clientName || "Aluno";`
);

fs.writeFileSync('server/jobs.ts', code);
