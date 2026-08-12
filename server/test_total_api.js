import http from 'http';
http.get('http://localhost:5000/api/finance/total-report', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});
