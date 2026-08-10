/**
 * /join/[slug] — Marina invite landing page.
 * Redirects to the app root where the boater logs in.
 * The marina slug is preserved as a query param for future marina-branded welcome screens.
 * No data fetching — pure redirect. Rule 2 compliant.
 */
import { redirect } from 'next/navigation'

export default function JoinPage({ params }: { params: { slug: string } }) {
  redirect(`/?marina=${params.slug}`)
}
