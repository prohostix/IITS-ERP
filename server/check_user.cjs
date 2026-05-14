const { PrismaClient } = require('./src/generated/client');
const p = new PrismaClient();
p.user.findFirst({ 
  where: { name: { contains: 'Sajila' } }, 
  include: { department: true } 
}).then((u) => {
  console.log(JSON.stringify(u, null, 2));
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
