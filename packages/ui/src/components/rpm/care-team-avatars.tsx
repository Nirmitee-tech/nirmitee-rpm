import * as React from 'react';
import { cn } from '../../utils/cn';

export interface CareTeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface CareTeamAvatarsProps extends React.HTMLAttributes<HTMLDivElement> {
  members: CareTeamMember[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

const CareTeamAvatars = React.forwardRef<HTMLDivElement, CareTeamAvatarsProps>(
  ({ className, members, maxVisible = 3, size = 'md', ...props }, ref) => {
    const visibleMembers = members.slice(0, maxVisible);
    const overflowCount = Math.max(0, members.length - maxVisible);

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    const getColorClass = (index: number) => {
      const colors = [
        'bg-purple-500',
        'bg-blue-500',
        'bg-green-500',
        'bg-yellow-500',
        'bg-red-500',
        'bg-pink-500',
        'bg-indigo-500',
        'bg-teal-500',
      ];
      return colors[index % colors.length];
    };

    return (
      <div
        ref={ref}
        className={cn('flex items-center', className)}
        {...props}
      >
        <div className="flex -space-x-2">
          {visibleMembers.map((member, index) => (
            <div
              key={member.id}
              className={cn(
                'relative inline-flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900',
                sizeClasses[size]
              )}
              title={`${member.name} - ${member.role}`}
            >
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div
                  className={cn(
                    'flex h-full w-full items-center justify-center rounded-full text-white font-semibold',
                    getColorClass(index)
                  )}
                >
                  {getInitials(member.name)}
                </div>
              )}
            </div>
          ))}

          {overflowCount > 0 && (
            <div
              className={cn(
                'relative inline-flex items-center justify-center rounded-full border-2 border-white bg-gray-300 text-gray-700 font-semibold dark:border-gray-900 dark:bg-gray-700 dark:text-gray-300',
                sizeClasses[size]
              )}
              title={`${overflowCount} more team member${overflowCount > 1 ? 's' : ''}`}
            >
              +{overflowCount}
            </div>
          )}
        </div>

        {members.length > 0 && (
          <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
            {members.length} team member{members.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }
);
CareTeamAvatars.displayName = 'CareTeamAvatars';

export { CareTeamAvatars };
