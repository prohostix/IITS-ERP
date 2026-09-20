import http from 'http';
const req = http.get('http://localhost:5000/api/v1/operations/programs/some-id/detail', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});
req.on('error', console.error);
