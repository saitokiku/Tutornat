import { redirect } from 'next/navigation';

import { PARENT_ROUTES } from '@/components/tutor/shell/nav';

/**
 * There is no separate reports index. It listed the same learners as the
 * account page, with one button each, so a parent had to pick between two
 * pages that showed the same thing. The account page now carries the summary
 * per learner and links to each full report; this keeps older links working.
 */
export default function ReportsIndexPage() {
  redirect(PARENT_ROUTES.overview);
}
