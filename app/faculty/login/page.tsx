import { LoginForm } from '@/components/LoginForm';

export default function FacultyLoginPage() {
  return (
    <LoginForm
      title="Faculty Login"
      subtitle="University Timetable Management System"
      fields={[
        { name: 'username', label: 'Username', placeholder: 'Enter username' },
        { name: 'password', label: 'Password', type: 'password', placeholder: 'Enter password' },
      ]}
      submitLabel="Login"
      apiEndpoint="/api/auth/faculty/login"
      redirectTo="/faculty/dashboard"
      alternateLink={{ href: '/student/login', label: 'Login as Student' }}
    />
  );
}
