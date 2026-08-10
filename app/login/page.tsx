import { LoginForm } from '@/components/LoginForm';
import { ORGANIZATION } from '@/lib/domain/constants';

export default function LoginPage() {
  return (
    <LoginForm
      title="CSMS Login"
      subtitle={`${ORGANIZATION.shortName} — ${ORGANIZATION.departmentCode} Department`}
    />
  );
}
