import { useEffect, useState } from 'react';
import { getInitials } from '../../utils/format';
import { assetUrl } from '../../utils/assetUrl';

const SIZES = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-20 w-20 text-2xl' };

// `src` may be a stored path like "/uploads/avatars/x.jpg". Falls back to initials.
export default function Avatar({ name, src, size = 'md' }) {
  const cls = SIZES[size] || SIZES.md;
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);

  const url = assetUrl(src);
  if (url && !failed) {
    return <img src={url} alt={name} onError={() => setFailed(true)} className={`${cls} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <div className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700`}>
      {getInitials(name)}
    </div>
  );
}
