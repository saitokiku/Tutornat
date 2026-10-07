import { redirect } from 'next/navigation';

import { PARENT_ROUTES } from '@/components/tutor/shell/nav';

/** The learner list lives on the parent overview; this keeps an older link working. */
export default function LearnersPage() {
  redirect(PARENT_ROUTES.overview);
}
