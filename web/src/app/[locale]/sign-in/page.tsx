import { SignInRoute } from '@/features/auth/SignInRoute';
export const instant = false;
export default function SignInPage(props: PageProps<'/[locale]/sign-in'>) {
  return <SignInRoute {...props} />;
}
