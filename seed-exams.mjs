import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function seedExams() {
  try {
    // Get all clients
    const clients = await sql`SELECT id, name, "trainerId" FROM clients LIMIT 100`;
    console.log(`Found ${clients.length} clients`);

    let created = 0;

    for (const client of clients) {
      // Exam 1: Hipertrofia (ganho de massa muscular)
      const exam1Date = new Date();
      exam1Date.setDate(exam1Date.getDate() - 60);
      const exam1DateStr = exam1Date.toISOString().split('T')[0];

      const exam1 = {
        trainerId: client.trainerId,
        clientId: client.id,
        date: exam1DateStr,
        weight: '75.5',
        muscleMass: '28.5',
        musclePct: '37.8',
        bodyFatPct: '18.5',
        visceralFat: '8.2',
        perimetria: JSON.stringify({
          chest: '98.5',
          waist: '82.3',
          hip: '95.2',
          thigh: '58.5',
          calf: '38.2',
          arm: '32.1',
          forearm: '28.5'
        }),
        dobras: JSON.stringify({
          triceps: '12.5',
          biceps: '8.3',
          chest: '10.2',
          midaxillary: '9.8',
          suprailiac: '11.5',
          abdominal: '15.3',
          thigh: '18.2',
          calf: '10.5'
        }),
        notes: 'Exame inicial - baseline para hipertrofia'
      };

      await sql`
        INSERT INTO "bioimpedanceExams" 
        (trainerId, clientId, date, weight, "muscleMass", "musclePct", "bodyFatPct", "visceralFat", perimetria, dobras, notes)
        VALUES 
        (${exam1.trainerId}, ${exam1.clientId}, ${exam1.date}, ${exam1.weight}, ${exam1.muscleMass}, ${exam1.musclePct}, ${exam1.bodyFatPct}, ${exam1.visceralFat}, ${exam1.perimetria}, ${exam1.dobras}, ${exam1.notes})
      `;
      created++;

      // Exam 2: Resultado após 60 dias
      const exam2Date = new Date();
      const exam2DateStr = exam2Date.toISOString().split('T')[0];

      const exam2 = {
        trainerId: client.trainerId,
        clientId: client.id,
        date: exam2DateStr,
        weight: '78.2',
        muscleMass: '30.8',
        musclePct: '39.4',
        bodyFatPct: '17.8',
        visceralFat: '7.9',
        perimetria: JSON.stringify({
          chest: '101.2',
          waist: '81.5',
          hip: '96.8',
          thigh: '60.2',
          calf: '39.1',
          arm: '33.5',
          forearm: '29.2'
        }),
        dobras: JSON.stringify({
          triceps: '11.8',
          biceps: '7.9',
          chest: '9.5',
          midaxillary: '9.2',
          suprailiac: '10.8',
          abdominal: '14.2',
          thigh: '16.9',
          calf: '9.8'
        }),
        notes: 'Após 60 dias - ganho de massa muscular com redução de gordura'
      };

      await sql`
        INSERT INTO "bioimpedanceExams" 
        (trainerId, clientId, date, weight, "muscleMass", "musclePct", "bodyFatPct", "visceralFat", perimetria, dobras, notes)
        VALUES 
        (${exam2.trainerId}, ${exam2.clientId}, ${exam2.date}, ${exam2.weight}, ${exam2.muscleMass}, ${exam2.musclePct}, ${exam2.bodyFatPct}, ${exam2.visceralFat}, ${exam2.perimetria}, ${exam2.dobras}, ${exam2.notes})
      `;
      created++;

      console.log(`✓ Created 2 exams for client: ${client.name}`);
    }

    console.log(`\n✅ Successfully created ${created} exams`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding exams:', error);
    process.exit(1);
  }
}

seedExams();
