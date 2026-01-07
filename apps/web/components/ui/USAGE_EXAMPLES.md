# UI Components Usage Examples

This document provides examples of how to use the new UI components added to NirmiteeRPM.

## DataTable Component

A fully-featured data table with sorting, pagination, search, and row selection.

### Basic Usage

```tsx
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const columns: DataTableColumn<User>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
  },
  {
    key: 'email',
    header: 'Email',
    sortable: true,
  },
  {
    key: 'role',
    header: 'Role',
  },
];

function UsersTable() {
  const users: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      searchable
      searchPlaceholder="Search users..."
      emptyMessage="No users found"
    />
  );
}
```

### With Custom Rendering

```tsx
const columns: DataTableColumn<User>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    render: (user) => (
      <div className="flex items-center gap-2">
        <img src={user.avatar} className="h-8 w-8 rounded-full" />
        <span>{user.name}</span>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (user) => (
      <span className={user.active ? 'text-green-600' : 'text-gray-400'}>
        {user.active ? 'Active' : 'Inactive'}
      </span>
    ),
  },
];
```

### With Row Selection

```tsx
function UsersTable() {
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  return (
    <>
      <DataTable
        columns={columns}
        data={users}
        selectable
        onSelectionChange={setSelectedUsers}
      />
      {selectedUsers.length > 0 && (
        <div>Selected: {selectedUsers.length} users</div>
      )}
    </>
  );
}
```

---

## React Hook Form Integration

Components for building forms with validation using react-hook-form and zod.

### Basic Form Example

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormError,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof formSchema>;

function SignupForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    console.log('Form data:', data);
    // Handle form submission
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Name</FormLabel>
            <FormControl>
              <Input placeholder="Enter your name" {...field} />
            </FormControl>
            <FormError />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="you@example.com" {...field} />
            </FormControl>
            <FormDescription>
              We'll never share your email with anyone else.
            </FormDescription>
            <FormError />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Password</FormLabel>
            <FormControl>
              <Input type="password" placeholder="••••••••" {...field} />
            </FormControl>
            <FormError />
          </FormItem>
        )}
      />

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Creating...' : 'Create Account'}
      </Button>
    </Form>
  );
}
```

---

## Confirmation Dialog

A dialog component for confirming user actions with support for danger variant.

### Basic Usage

```tsx
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';

function DeleteUserButton({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    await deleteUser(userId);
    // Handle success
  };

  return (
    <>
      <Button variant="danger" onClick={() => setIsOpen(true)}>
        Delete User
      </Button>

      <ConfirmDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        onConfirm={handleDelete}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}
```

### Using the Hook

```tsx
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

function MyComponent() {
  const { confirm, dialog } = useConfirmDialog();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Item',
      description: 'Are you sure?',
      variant: 'danger',
      onConfirm: async () => {
        await deleteItem();
      },
    });

    if (confirmed) {
      console.log('User confirmed');
    }
  };

  return (
    <>
      <Button onClick={handleDelete}>Delete</Button>
      {dialog}
    </>
  );
}
```

---

## Toast Notifications

Simple toast notifications using sonner.

### Basic Usage

```tsx
import { toast } from '@/lib/toast';

function MyComponent() {
  const handleSuccess = () => {
    toast.success('User created successfully');
  };

  const handleError = () => {
    toast.error('Failed to create user', 'Please try again');
  };

  const handleInfo = () => {
    toast.info('New update available');
  };

  const handleWarning = () => {
    toast.warning('Your session will expire soon');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleError}>Show Error</button>
      <button onClick={handleInfo}>Show Info</button>
      <button onClick={handleWarning}>Show Warning</button>
    </div>
  );
}
```

### Loading State

```tsx
import { toast } from '@/lib/toast';

async function saveData() {
  const toastId = toast.loading('Saving data...');

  try {
    await api.save();
    toast.dismiss(toastId);
    toast.success('Data saved successfully');
  } catch (error) {
    toast.dismiss(toastId);
    toast.error('Failed to save data');
  }
}
```

### Promise Toast

```tsx
import { toast } from '@/lib/toast';

function MyComponent() {
  const handleSave = () => {
    toast.promise(
      saveUser(),
      {
        loading: 'Saving user...',
        success: 'User saved successfully!',
        error: 'Failed to save user',
      }
    );
  };

  return <button onClick={handleSave}>Save</button>;
}
```

---

## Integration Notes

### Internationalization (i18n)

All components use the `useTranslations` hook for i18n support:

```tsx
import { useTranslations } from '@/lib/i18n/i18n-context';

function MyComponent() {
  const { t } = useTranslations('common');

  return <button>{t('save')}</button>;
}
```

### TypeScript

All components are fully typed with TypeScript. The DataTable component uses generics for type safety:

```tsx
// Fully typed
const columns: DataTableColumn<User>[] = [...];
<DataTable<User> columns={columns} data={users} />
```

### Styling

All components use Tailwind CSS and follow the existing design system:
- Brand color: `text-brand`, `bg-brand`
- Danger color: `text-danger`, `bg-danger`
- Success color: `text-success`, `bg-success`
- Dark mode: Uses `dark:` variants

---

## Files Created

1. `/apps/web/components/ui/data-table.tsx` - DataTable component
2. `/apps/web/components/ui/form.tsx` - Form components (Form, FormField, FormLabel, FormError, etc.)
3. `/apps/web/components/ui/confirm-dialog.tsx` - Confirmation dialog
4. `/apps/web/lib/toast.ts` - Toast utility
5. `/apps/web/app/layout.tsx` - Updated with Toaster component
6. `/apps/web/messages/en.json` - Added translations
7. `/apps/web/messages/hi.json` - Added translations
8. `/apps/web/.eslintrc.json` - Added ESLint config
