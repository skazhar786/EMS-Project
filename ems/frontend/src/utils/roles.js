export const ROLES = Object.freeze({ ADMIN: 'ADMIN', EMPLOYEE: 'EMPLOYEE' });

// Where each role lands after login (and when redirected away from a forbidden page).
export const homePathFor = (role) =>
  role === ROLES.ADMIN ? '/admin/dashboard' : '/employee/dashboard';
