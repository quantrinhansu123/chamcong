interface UserAvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-20 h-20 text-xl',
};

export default function UserAvatar({ name, imageUrl, size = 'md', className = '' }: UserAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  if (imageUrl) {
    return (
      <img
        alt={name}
        src={imageUrl}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-red-100 text-red-800 font-bold flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}
    >
      {initial}
    </div>
  );
}
