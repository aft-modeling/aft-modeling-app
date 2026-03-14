import { redirect } from 'next/navigation'

export default function MetaAdsPortalPage() {
  // All Meta Ads users are admin — redirect to admin dashboard
  redirect('/portal/meta-ads/admin')
}
