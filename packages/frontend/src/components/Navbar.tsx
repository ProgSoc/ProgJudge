import {
  Box,
  Button,
  Flex,
  Stack,
  useColorMode,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { trpc } from "../utils/trpc";

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
      <Flex
        bg={colorMode === "light" ? "gray.100" : "gray.900"}
        minH="60px"
        py={{ base: 2 }}
        px={{ base: 4 }}
        borderBottom={1}
        borderStyle={"solid"}
        borderColor={colorMode === "light" ? "gray.200" : "gray.700"}
        align={"center"}
      >
        <Stack
          flex={{ base: 1, md: 0 }}
          justify={"flex-end"}
          direction={"row"}
          spacing={6}
        >
          {me.data === null ? (
            <Button as={Link} to="/login">
              Login
            </Button>
          ) : (
            <Button onClick={() => logout.mutate()} isLoading={logout.isLoading}>Logout</Button>
          )}

          <Button as={Link} to="/admin/competitions">
            Docs
          </Button>
        </Stack>
      </Flex>
    </Box>
  );
}
