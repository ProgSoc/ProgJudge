import { Link, LoaderFunctionArgs, useLoaderData } from "react-router-dom";
import { z } from "zod";
import { trpc } from "../../../utils/trpc";
import { Box, Container, Heading } from "@chakra-ui/react";

export async function loader({ params }: LoaderFunctionArgs) {
  const id = await z.string().uuid().parseAsync(params.competitionId);
  return id;
}

export function Component() {
  const competitionId = useLoaderData() as string;
  const competitionTeams =
    trpc.teams.getCompetitionTeams.useQuery(competitionId);
  const competition =
    trpc.competitions.getAdminCompetitionDetails.useQuery(competitionId);

  return (
    <Container maxW={"container.md"}>
      <Heading>{competition.data?.name ?? "Loading"} Teams</Heading>
      <Box
        borderRadius={"md"}
        borderWidth={"1px"}
        borderColor={"gray.200"}
        p={2}
      >
        {competitionTeams.data?.map((team) => (
          <Box key={team.id} as={Link}>
            {team.name}
          </Box>
        ))}
      </Box>
    </Container>
  );
}
