import { LoginForm } from '@/components/LoginForm';
import { ORGANIZATION } from '@/lib/domain/constants';

export default function LoginPage() {
  return (
    <LoginForm
      title="Sign-in"
      subtitle={`Administrators and faculty · ${ORGANIZATION.shortName} ${ORGANIZATION.departmentCode}`}
    />
  );
}
