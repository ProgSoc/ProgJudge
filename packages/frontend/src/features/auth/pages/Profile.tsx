import { Box, Container, Heading } from "@chakra-ui/react";
import { Link, LoaderFunctionArgs } from "react-router-dom";
import { trpc } from "../../../utils/trpc";

export async function loader({ params }: LoaderFunctionArgs) {
  return null;
}

export function Component() {
    const myTeams = trpc.auth.getMyTeams.useQuery()

  return (
    <Container maxW="container.md">
      <Heading>Profile</Heading>
      <Heading size="xl">Teams</Heading>
      <Box
        borderRadius={"md"}
        borderWidth={"1px"}
        borderColor={"gray.200"}
        p={2}
      >
        {myTeams.data?.map((team) => (
            <Box key={team.id} as={Link}>{team.name}</Box>
        ))}
      </Box>
    </Container>
  );
}
