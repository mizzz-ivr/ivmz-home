import type { Access } from 'payload'

import { isAuthenticated } from '@/access/is-authenticated'

export const publishedOrAuthenticated: Access = ({ req: { user } }) => {
  if (user) return true

  return {
    _status: {
      equals: 'published',
    },
  }
}

export const publicScheduleOrAuthenticated: Access = ({ req: { user } }) => {
  if (user) return true

  return {
    visibility: {
      equals: 'public',
    },
  }
}

export const enabledSocialOrAuthenticated: Access = ({ req: { user } }) => {
  if (user) return true

  return {
    enabled: {
      equals: true,
    },
  }
}

export const contentMutationAccess = isAuthenticated
export const contentVersionAccess = isAuthenticated
