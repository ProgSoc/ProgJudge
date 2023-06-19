import {
  Box,
  Button,
  Flex,
  HStack,
  Spacer,
  Stack,
  useColorMode,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { trpc } from "../utils/trpc";
import ThemeIconButton from "./ThemeIconButton";

export default function Navbar() {
  const { colorMode } = useColorMode();
  const me = trpc.auth.getMe.useQuery();
  const trpcContext = trpc.useContext();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      trpcContext.auth.getMe.invalidate();
    },
  });

  return (
    <Box>
      <HStack
        bg={colorMode === "light" ? "gray.100" : "gray.900"}
        minH="60px"
        py={{ base: 2 }}
        px={{ base: 4 }}
        borderBottom={1}
        borderStyle={"solid"}
        borderColor={colorMode === "light" ? "gray.200" : "gray.700"}
        align={"center"}
        spacing={4}
      >
        
          {me.data === null ? (
            <Button as={Link} to="/login" variant={"link"}>
              Login
            </Button>
          ) : (
            <Button onClick={() => logout.mutate()} isLoading={logout.isLoading} variant={"link"}>Logout</Button>
          )}

          <Button as={Link} to="/admin/competitions" variant={"link"}>
            Admin
          </Button>
          <Spacer />
          <ThemeIconButton />
       
      </HStack>
    </Box>
  );
}
