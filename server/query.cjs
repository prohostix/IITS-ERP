const { Client } = require('pg')
const client = new Client({ connectionString: 'postgresql://retro@localhost:5436/postgres?sslmode=disable' })
async function main() {
  await client.connect()
  const res = await client.query("SELECT id, status, \"studentName\", \"studentId\", \"enrollmentNumber\" FROM \"Enrollment\" WHERE \"studentName\" ILIKE '%TESTGLA%'")
  console.log("Enrollments:", res.rows)
  const students = await client.query("SELECT id, status, name, \"enrollmentNo\", \"centerId\" FROM \"Student\" WHERE name ILIKE '%TESTGLA%'")
  console.log("Students:", students.rows)
  await client.end()
}
main().catch(console.error)
