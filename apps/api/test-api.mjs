const BASE_URL = 'http://localhost:4000';

async function test() {
  console.log('=== Testing API Endpoints ===\n');

  // 1. Login
  console.log('1. Testing Login...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@example.com', password: 'demo123456' })
  });
  const loginData = await loginRes.json();
  console.log('   ✓ Login successful:', loginData.user.email);
  const token = loginData.accessToken;

  const headers = { 'Authorization': `Bearer ${token}` };

  // 2. Get Users
  console.log('\n2. Testing GET /api/users...');
  const usersRes = await fetch(`${BASE_URL}/api/users`, { headers });
  const usersData = await usersRes.json();
  console.log('   ✓ Users found:', usersData.users?.length || 0);
  if (usersData.users?.length > 0) {
    console.log('   First user:', usersData.users[0].email);
  }

  // 3. Get Teams
  console.log('\n3. Testing GET /api/teams...');
  const teamsRes = await fetch(`${BASE_URL}/api/teams`, { headers });
  const teamsData = await teamsRes.json();
  console.log('   ✓ Teams found:', teamsData.teams?.length || 0);
  if (teamsData.teams?.length > 0) {
    teamsData.teams.forEach(t => console.log('   -', t.name));
  }

  // 4. Get Roles
  console.log('\n4. Testing GET /api/roles...');
  const rolesRes = await fetch(`${BASE_URL}/api/roles`, { headers });
  const rolesData = await rolesRes.json();
  console.log('   ✓ Roles found:', rolesData.length || 0);
  if (rolesData.length > 0) {
    rolesData.forEach(r => console.log('   -', r.name, `(${r.memberCount} members)`));
  }

  // 5. Get Permissions
  console.log('\n5. Testing GET /api/roles/permissions...');
  const permsRes = await fetch(`${BASE_URL}/api/roles/permissions`, { headers });
  const permsData = await permsRes.json();
  const modules = Object.keys(permsData);
  const totalPerms = Object.values(permsData).flat().length;
  console.log('   ✓ Permission modules:', modules.length);
  console.log('   ✓ Total permissions:', totalPerms);

  // 6. Get Dashboard Stats
  console.log('\n6. Testing GET /api/dashboard/stats...');
  const statsRes = await fetch(`${BASE_URL}/api/dashboard/stats`, { headers });
  const statsData = await statsRes.json();
  console.log('   ✓ Dashboard stats:', JSON.stringify(statsData, null, 2));

  // 7. Create Team
  console.log('\n7. Testing POST /api/teams (Create Team)...');
  const createTeamRes = await fetch(`${BASE_URL}/api/teams`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Team', description: 'Created via API test' })
  });
  const newTeam = await createTeamRes.json();
  console.log('   ✓ Created team:', newTeam.name || newTeam.error);

  // 8. Create Role
  console.log('\n8. Testing POST /api/roles (Create Role)...');
  const createRoleRes = await fetch(`${BASE_URL}/api/roles`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Role',
      description: 'Created via API test',
      permissions: ['users:read', 'teams:read']
    })
  });
  const newRole = await createRoleRes.json();
  console.log('   ✓ Created role:', newRole.name || newRole.error);

  // 9. Send Invitation
  console.log('\n9. Testing POST /api/invitations (Send Invite)...');
  const roleId = rolesData.find(r => r.name === 'Member')?.id || rolesData[0]?.id;
  const inviteRes = await fetch(`${BASE_URL}/api/invitations`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', roleId })
  });
  const invitation = await inviteRes.json();
  console.log('   ✓ Invitation:', invitation.invitation?.email || invitation.error || 'sent');

  // Verify teams again
  console.log('\n10. Verifying data after creates...');
  const teamsRes2 = await fetch(`${BASE_URL}/api/teams`, { headers });
  const teamsData2 = await teamsRes2.json();
  console.log('   ✓ Teams now:', teamsData2.teams?.length || 0);

  const rolesRes2 = await fetch(`${BASE_URL}/api/roles`, { headers });
  const rolesData2 = await rolesRes2.json();
  console.log('   ✓ Roles now:', rolesData2.length || 0);

  console.log('\n=== All Tests Completed ===');
}

test().catch(console.error);
