fetch('http://localhost:5000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'ops@erp.com', password: 'password123' })
})
.then(r => r.json())
.then(res => {
  const token = res.token;
  if (!token) return console.log('no token', res);
  fetch('http://localhost:5000/api/v1/operations/programs', {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(res => {
    const prog = res.data[0];
    if(!prog) return console.log('no prog');
    fetch(`http://localhost:5000/api/v1/operations/programs/${prog.id}/detail`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(res => console.log('DETAIL RES:', JSON.stringify(res, null, 2)))
    .catch(console.error);
  })
  .catch(console.error);
})
.catch(console.error);
