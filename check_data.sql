SELECT COUNT(*) as total_clients FROM clients;
SELECT COUNT(*) as total_exams FROM "bioimpedanceExams";
SELECT id, name, "trainerId" FROM clients LIMIT 5;
SELECT id, "clientId", date, weight FROM "bioimpedanceExams" LIMIT 5;
