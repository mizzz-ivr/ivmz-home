import type { ContactCategory } from '@/lib/contact-routing'

/** Visible labels for the contact categories, shared by the form and the notification email. */
export const contactCategoryLabels: Record<ContactCategory, string> = {
  collaboration: 'Collaboration',
  community: 'ivRooom / Community',
  development: 'Technical / OSS / Development',
  job: 'Job / Work',
  media: 'Media / Interview',
  personal: 'General / Personal',
  security: 'Security',
  team: 'ivRooom / Team',
}
