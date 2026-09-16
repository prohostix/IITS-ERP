import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ 
  connectionString: 'postgresql://retro@localhost:5436/postgres?sslmode=disable',
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const orphans = await prisma.enrollment.findMany({
    where: { status: 'enrolled', studentId: null },
    select: { id: true, studentName: true, status: true, paymentType: true }
  })
  console.log("Orphans:", orphans)

  const uniReview = await prisma.enrollment.findMany({
    where: { status: 'university_review' },
    select: { id: true }
  })
  console.log("Uni review:", uniReview)
}
main().catch(console.error).finally(() => prisma.$disconnect())
