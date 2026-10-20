import { SignInRoute } from '@/features/auth/SignInRoute';
export const instant = false;
export default function LoginModal(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  return <SignInRoute {...props} modal />;
}
