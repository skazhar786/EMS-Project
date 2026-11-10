import { getInitials } from '../../utils/format';

const SIZES = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-20 w-20 text-2xl' };

export default function Avatar({ name, src, size = 'md' }) {
  const cls = SIZES[size] || SIZES.md;
  if (src) return <img src={src} alt={name} className={`${cls} shrink-0 rounded-full object-cover`} />;
  return (
    <div className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700`}>
      {getInitials(name)}
    </div>
  );
}
