import { Spinner } from "@chakra-ui/react";
import { trpc } from "../utils/trpc";
import { Navigate, Outlet } from "react-router-dom";

export default function AuthLayout () {
    const me = trpc.auth.getMe.useQuery()

    if (me.isLoading || me.isError) {
        return <Spinner />;
      } else if (me.data !== null) {
        return <Outlet />;
      } else {
        return <Navigate to="/" />;
      }
}