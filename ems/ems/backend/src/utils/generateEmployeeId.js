import Counter from '../models/Counter.js';

export const generateEmployeeId = async () => {
  const n = await Counter.next('employeeId');
  return `EMP-${String(n).padStart(4, '0')}`;
};
