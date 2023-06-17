import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter} from '../../../backend/src/router.ts'

export const trpc = createTRPCReact<AppRouter>();