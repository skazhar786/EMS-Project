import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '../ui/Avatar';

const MAX_SIZE = 2 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// onUpload(file) and onRemove() must return promises and throw on failure.
export default function AvatarUploader({ name, src, onUpload, onRemove }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const run = async (action, successMessage) => {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
    } catch (err) {
      toast.error(err.userMessage);
    } finally {
      setBusy(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again later
    if (!file) return;
    if (!TYPES.includes(file.type)) return toast.error('Please choose a JPG, PNG or WebP image');
    if (file.size > MAX_SIZE) return toast.error('Image must be 2 MB or smaller');
    run(() => onUpload(file), 'Profile picture updated');
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={name} src={src} size="lg" />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
        <button type="button" className="btn-secondary !py-1.5" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Camera className="h-4 w-4" /> {src ? 'Change photo' : 'Upload photo'}
        </button>
        {src && (
          <button
            type="button" className="btn-secondary !py-1.5 text-red-600" disabled={busy}
            onClick={() => run(onRemove, 'Profile picture removed')}
          >
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        )}
        <p className="text-xs text-slate-500">JPG, PNG or WebP, up to 2 MB.</p>
      </div>
    </div>
  );
}
