const fs = require('fs');
let code = fs.readFileSync('server/jobs.ts', 'utf8');

code = code.replace(
  `      // Get client name

      const dueDate`,
  `      // Get client name
      const clientName = tx.clientName || "Aluno";

      const dueDate`
);

fs.writeFileSync('server/jobs.ts', code);
