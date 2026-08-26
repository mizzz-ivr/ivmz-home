import { postgresAdapter } from '@payloadcms/db-postgres'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Media } from './collections/Media'
import { News } from './collections/News'
import { Posts } from './collections/Posts'
import { Schedule } from './collections/Schedule'
import { SocialLinks } from './collections/SocialLinks'
import { Users } from './collections/Users'
import { Works } from './collections/Works'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const allowedOrigins = (
  process.env.PAYLOAD_ALLOWED_ORIGINS ?? 'http://localhost:3000,https://ivmz.ivrm.jp'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Works, Posts, News, Schedule, SocialLinks],
  cors: {
    origins: allowedOrigins,
  },
  csrf: allowedOrigins,
  db: postgresAdapter({
    disableCreateDatabase: true,
    migrationDir: path.resolve(dirname, 'migrations'),
    pool: {
      connectionString: process.env.DATABASE_URL ?? '',
    },
    push: false,
    schemaName: 'ivmz_home',
  }),
  defaultDepth: 1,
  defaultMaxTextLength: 10_000,
  graphQL: {
    disable: true,
  },
  maxDepth: 3,
  secret: process.env.PAYLOAD_SECRET ?? '',
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL,
  sharp,
  telemetry: false,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
