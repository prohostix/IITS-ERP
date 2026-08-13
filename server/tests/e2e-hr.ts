import axios from 'axios';

const BASE_URL = 'http://localhost:3677/api/v1';

async function runTest() {
  console.log('Starting E2E HR test...');
  
  // 1. Login as Ops Admin
  const opsRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'ops.admin@edutechglobal.com',
    password: 'opsadmin123'
  });
  const opsToken = opsRes.data.data.token;
  
  // 2. Raise Hiring Request as Ops Admin
  const hrReq = await axios.post(`${BASE_URL}/hiring/request`, {
    title: 'Senior Operations Executive',
    count: 2,
    description: 'Need experienced ops execs for the new branch'
  }, { headers: { Authorization: `Bearer ${opsToken}` } });
  
  const hiringRequestId = hrReq.data.data.id;
  console.log('✅ Hiring request created:', hiringRequestId);
  
  // 3. Login as HR Admin
  const hrRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'hr.admin@edutechglobal.com',
    password: 'hradmin123'
  });
  const hrToken = hrRes.data.data.token;
  
  // 4. Approve Hiring Request
  await axios.put(`${BASE_URL}/hiring/request/${hiringRequestId}/status`, {
    status: 'approved'
  }, { headers: { Authorization: `Bearer ${hrToken}` } });
  console.log('✅ Hiring request approved');
  
  // 5. Add Candidate
  const candRes = await axios.post(`${BASE_URL}/hiring/request/${hiringRequestId}/candidate`, {
    name: 'Jane Doe',
    email: 'jane.doe.test' + Date.now() + '@example.com',
    phone: '9876543210'
  }, { headers: { Authorization: `Bearer ${hrToken}` } });
  
  const candidateId = candRes.data.data.id;
  console.log('✅ Candidate added:', candidateId);
  
  // 6. Move Candidate to Joined
  await axios.put(`${BASE_URL}/hiring/candidate/${candidateId}/status`, {
    status: 'joined',
    joinDate: new Date().toISOString()
  }, { headers: { Authorization: `Bearer ${hrToken}` } });
  
  console.log('✅ Candidate marked as joined. Auto-onboarding should trigger.');
  
  console.log('🎉 End to end test successful!');
}

runTest().catch(console.error);
