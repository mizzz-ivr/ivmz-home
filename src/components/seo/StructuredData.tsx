import { serializeStructuredData, type StructuredDataValue } from '@/lib/structured-data'

type StructuredDataProps = {
  data: StructuredDataValue | null
}

export function StructuredData({ data }: StructuredDataProps) {
  if (!data) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeStructuredData(data) }}
    />
  )
}
