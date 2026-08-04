import { LoginForm } from '@/components/LoginForm';

export default function AdminLoginPage() {
  return (
    <LoginForm
      title="Admin Login"
      subtitle="University Timetable Management System"
      fields={[
        { name: 'username', label: 'Username', placeholder: 'Enter username' },
        { name: 'password', label: 'Password', type: 'password', placeholder: 'Enter password' },
      ]}
      submitLabel="Login"
      apiEndpoint="/api/auth/admin/login"
      redirectTo="/admin/dashboard"
    />
  );
}
