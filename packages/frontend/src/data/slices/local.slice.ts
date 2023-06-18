import { createSlice } from "@reduxjs/toolkit";

interface LocalState {
    currentCompetition?: string;
}

const initialState: LocalState = {

}

export const localSlice = createSlice({
    name: "local",
    initialState,
    reducers: {}
})