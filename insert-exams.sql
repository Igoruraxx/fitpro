-- Get all clients and create 2 exams for each
WITH client_list AS (
  SELECT id, "trainerId", name FROM clients LIMIT 100
)
INSERT INTO "bioimpedanceExams" 
(trainerId, clientId, date, weight, "muscleMass", "musclePct", "bodyFatPct", "visceralFat", perimetria, dobras, notes)
SELECT 
  c."trainerId",
  c.id,
  CURRENT_DATE - INTERVAL '60 days',
  75.5,
  28.5,
  37.8,
  18.5,
  8.2,
  '{"chest": "98.5", "waist": "82.3", "hip": "95.2", "thigh": "58.5", "calf": "38.2", "arm": "32.1", "forearm": "28.5"}',
  '{"triceps": "12.5", "biceps": "8.3", "chest": "10.2", "midaxillary": "9.8", "suprailiac": "11.5", "abdominal": "15.3", "thigh": "18.2", "calf": "10.5"}',
  'Exame inicial - baseline para hipertrofia'
FROM client_list c
UNION ALL
SELECT 
  c."trainerId",
  c.id,
  CURRENT_DATE,
  78.2,
  30.8,
  39.4,
  17.8,
  7.9,
  '{"chest": "101.2", "waist": "81.5", "hip": "96.8", "thigh": "60.2", "calf": "39.1", "arm": "33.5", "forearm": "29.2"}',
  '{"triceps": "11.8", "biceps": "7.9", "chest": "9.5", "midaxillary": "9.2", "suprailiac": "10.8", "abdominal": "14.2", "thigh": "16.9", "calf": "9.8"}',
  'Após 60 dias - ganho de massa muscular com redução de gordura'
FROM client_list c;
