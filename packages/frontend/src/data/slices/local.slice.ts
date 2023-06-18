import { PayloadAction, createSlice } from "@reduxjs/toolkit";

interface LocalState {
    currentCompetition: string | null;
}

const initialState: LocalState = {
    currentCompetition: null
}

export const localSlice = createSlice({
    name: "local",
    initialState,
    reducers: {
        setCurrentCompetition: (state, action: PayloadAction<string | null>) => {
            state.currentCompetition = action.payload;
        }
    }
})