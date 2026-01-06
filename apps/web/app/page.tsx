import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to login by default
  // In a real app, this would check auth state and redirect accordingly
  redirect('/login');
}
