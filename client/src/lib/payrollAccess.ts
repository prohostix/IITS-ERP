export function canAccessPayroll(user: any): boolean {
  if (!user) return false;
  const email = String(user.email || '').trim().toLowerCase();
  const name = String(user.name || '').trim().toLowerCase();

  const allowedEmails = [
    'accountsmanager@iitseducation.org', // Shaju A
    'groupaccounts@iitseducation.org',   // Pramod P P
  ];
  if (allowedEmails.includes(email)) return true;

  return /\bshaju\b/i.test(name) || /\bpramod\b/i.test(name);
}
