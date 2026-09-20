const axios = require('axios');
axios.post('http://localhost:5578/api/v1/auth/login', { email: 'ops@erp.com', password: 'password123' })
  .then(res => {
    const token = res.data.token;
    return axios.get('http://localhost:5578/api/v1/operations/programs', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const prog = res.data.data[0];
        if(!prog) return console.log('no prog');
        return axios.get(`http://localhost:5578/api/v1/operations/programs/${prog.id}/detail`, { headers: { Authorization: `Bearer ${token}` } })
          .then(res => console.log('DETAIL RES:', res.data))
          .catch(err => console.log('DETAIL ERR:', err.response?.data || err.message));
      });
  })
  .catch(err => console.log('LOGIN ERR:', err.response?.data || err.message));
