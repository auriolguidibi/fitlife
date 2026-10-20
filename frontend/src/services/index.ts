import type { DataService } from './types'
import { mockAdapter } from './mock/mockAdapter'
import { restAdapter } from './rest/restAdapter'

const mode = (import.meta.env.VITE_DATA_MODE as string | undefined) ?? 'mock'

export const api: DataService = mode === 'api' ? restAdapter : mockAdapter

export type { DataService }
export { ApiError } from './types'
