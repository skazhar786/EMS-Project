// Maps backend validation errors ({ field, message }[]) onto react-hook-form fields.
export const applyServerErrors = (err, setError) => {
  const list = err?.response?.data?.errors;
  if (!Array.isArray(list)) return;
  list.forEach((e) => {
    if (e.field) setError(e.field, { type: 'server', message: e.message });
  });
};

// ISO date -> value usable by <input type="date">
export const toInputDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};
