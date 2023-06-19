import { Link, LoaderFunctionArgs, useLoaderData } from "react-router-dom";
import { z } from "zod";
import { trpc } from "../../../utils/trpc";
import { Box, Container, Heading } from "@chakra-ui/react";

const searchParamsSchema = z.object({
  competitionId: z.string().uuid().optional(),
});

export async function loader({ params, request: { url} }: LoaderFunctionArgs) {
  const reqUrl = new URL(url);
  const rawSearchParams = Object.fromEntries(reqUrl.searchParams.entries());

  const searchParams = await searchParamsSchema.parseAsync(rawSearchParams);
  return searchParams;
}

export function Component() {
  const {competitionId} = useLoaderData() as z.infer<typeof searchParamsSchema>;
  const competitionTeams =
    trpc.teams.getCompetitionTeams.useQuery(competitionId);

  return (
    <Container maxW={"container.md"}>
      <Heading>Teams</Heading>
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
