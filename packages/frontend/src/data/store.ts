import { configureStore } from '@reduxjs/toolkit'
import { localSlice } from './slices/local.slice'

export const store = configureStore({
  reducer: {
    local: localSlice.reducer,
  },
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch