import { trpc } from "../utils/trpc";

export default function useIsAuthed () {
    const user = trpc.auth.getMe.useQuery()

    if (user.data) {
        return true
    }

    return false
}