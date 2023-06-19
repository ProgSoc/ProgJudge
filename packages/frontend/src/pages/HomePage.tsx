import {
  Button,
  Center,
  Container,
  HStack,
  Heading,
  Stack,
} from "@chakra-ui/react";
import { trpc } from "../utils/trpc";
import { Link } from "react-router-dom";

export function Component() {
  const me = trpc.auth.getMe.useQuery();

  return (
    <Container maxW={"container.md"}>
      <Stack spacing={4} align={"center"}>
        <Heading>Home</Heading>
        <p>This is the home page.</p>
        <HStack>
          {me.data ? <Heading size="md" fontWeight={"semibold"}>
            Welcome, {me.data.username}!
          </Heading> : (
            <Button as={Link} to="/login">
              Login
            </Button>
          )}
        </HStack>
      </Stack>
    </Container>
  );
}
