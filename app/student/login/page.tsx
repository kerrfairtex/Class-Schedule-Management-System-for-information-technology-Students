import { LoginForm } from '@/components/LoginForm';

export default function StudentLoginPage() {
  return (
    <LoginForm
      title="Student Login"
      subtitle="University Timetable Management System"
      fields={[
        { name: 'sap', label: 'SAP ID', placeholder: 'Enter SAP ID' },
        { name: 'password', label: 'Password', type: 'password', placeholder: 'Enter password' },
      ]}
      submitLabel="Login"
      apiEndpoint="/api/auth/student/login"
      redirectTo="/student/dashboard"
      alternateLink={{ href: '/faculty/login', label: 'Login as Faculty' }}
    />
  );
}
