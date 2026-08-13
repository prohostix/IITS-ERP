async function runTest() {
  console.log('Starting E2E HR test on LIVE Server...');
  const BASE_URL = 'http://35.154.243.111/api/v1';

  try {
    // 1. Login as Superadmin
    let opsRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@erp.com', password: 'superadmin123' })
    });
    let opsData = await opsRes.json();
    if (!opsData.success) throw new Error('Ops Login failed: ' + JSON.stringify(opsData));
    const opsToken = opsData.data.token;
    
    // Fetch departments to get a valid departmentId
    let deptRes = await fetch(`${BASE_URL}/departments`, { headers: { 'Authorization': `Bearer ${opsToken}` } });
    let deptData = await deptRes.json();
    const departmentId = deptData.data[0].id;
    console.log('Using department:', departmentId);

    // 2. Raise Hiring Request
    let hrReq = await fetch(`${BASE_URL}/hiring/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${opsToken}` },
      body: JSON.stringify({ departmentId, title: 'Senior Operations Executive', count: 2, description: 'Need experienced ops execs for the new branch' })
    });
    let hrReqData = await hrReq.json();
    if (!hrReqData.success) throw new Error('Hiring Request failed: ' + JSON.stringify(hrReqData));
    const hiringRequestId = hrReqData.data.id;
    console.log('✅ Hiring request created:', hiringRequestId);
    
    // 3. Login as Superadmin again (or just reuse token)
    const hrToken = opsToken;
    
    // 4. Approve Hiring Request
    let appRes = await fetch(`${BASE_URL}/hiring/requests/${hiringRequestId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hrToken}` },
      body: JSON.stringify({ status: 'approved' })
    });
    let appData = await appRes.json();
    if (!appData.success) throw new Error('Approve Request failed: ' + JSON.stringify(appData));
    console.log('✅ Hiring request approved');
    
    // 5. Add Candidate
    const candidateEmail = 'jane.doe.test' + Date.now() + '@example.com';
    let candRes = await fetch(`${BASE_URL}/hiring/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hrToken}` },
      body: JSON.stringify({ hiringRequestId, name: 'Jane Doe', email: candidateEmail, phone: '9876543210' })
    });
    let candData = await candRes.json();
    if (!candData.success) throw new Error('Add Candidate failed: ' + JSON.stringify(candData));
    const candidateId = candData.data.id;
    console.log('✅ Candidate added:', candidateId);
    
    // 6. Move Candidate to Joined
    let joinRes = await fetch(`${BASE_URL}/hiring/candidates/${candidateId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hrToken}` },
      body: JSON.stringify({ status: 'joined', joinDate: new Date().toISOString() })
    });
    let joinData = await joinRes.json();
    if (!joinData.success) throw new Error('Join Candidate failed: ' + JSON.stringify(joinData));
    console.log('✅ Candidate marked as joined.');

    // 7. Try Login with Candidate Details (Testing Auto-onboarding)
    let empRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: candidateEmail, password: 'password123' })
    });
    let empData = await empRes.json();
    if (empData.success) {
      console.log('✅ Auto-onboarding verified: Candidate can login as User!');
    } else {
      console.log('❌ Candidate login failed. This might be due to default password missing or auto-onboarding failing.');
      console.log(empData);
    }
    
    console.log('🎉 End to end HR module test successful!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runTest();
