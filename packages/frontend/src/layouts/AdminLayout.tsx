import { Spinner, useToast } from "@chakra-ui/react";
import { trpc } from "../utils/trpc";
import { Navigate, Outlet } from "react-router-dom";
import { useCallback } from "react";

export default function AdminLayout() {
  const me = trpc.auth.getMe.useQuery();
  const toast = useToast();
  const toastNoAdmin = useCallback(() => {
    toast({
      title: "You are not an admin",
      status: "error",
      duration: 9000,
      isClosable: true,
    });
  }, [toast]);

  if (me.isLoading || !me.data) {
    return <Spinner />;
  } else if (me.data.roles.includes("Admin")) {
    return <Outlet />;
  } else {
    toastNoAdmin();
    return <Navigate to="/" />;
  }
}
