import { Box, Heading, SimpleGrid, Stack, Tag } from "@chakra-ui/react";
import { trpc } from "../../../utils/trpc";
import { Link } from "react-router-dom";

export default function TeamsCard () {
    const myTeams = trpc.auth.getMyTeams.useQuery()

    return <Box
    borderRadius={"md"}
    borderWidth={"1px"}
    borderColor={"gray.200"}
    p={2}
  >
    <Stack spacing={2}>
      <Heading size={"md"} fontWeight={"semibold"} textAlign={"center"}>
        Teams
      </Heading>
      <SimpleGrid columns={myTeams.data?.length ?? 1} spacing={3}>
        {myTeams.data?.length ? (
          myTeams.data?.map((team) => (
            <Tag
              key={team.id}
              borderRadius={"full"}
              py={2}
              justifyContent={"center"}
              as={Link}
              to={`/teams/${team.id}`}
            >
              {team.name}
            </Tag>
          ))
        ) : (
          <Box textAlign={"center"} py={2}>
            No Teams
          </Box>
        )}
      </SimpleGrid>
    </Stack>
  </Box>
}