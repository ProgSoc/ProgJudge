import {
  Box,
  Button,
  ButtonGroup,
  Container,
  Divider,
  Flex,
  HStack,
  Heading,
  IconButton,
  SimpleGrid,
  Stack,
  Tag,
  useColorMode,
} from "@chakra-ui/react";
import { trpc } from "../../../utils/trpc";
import { Link } from "react-router-dom";
import type { Competition } from "../../../../../backend/src/db/types";
import { FaPlus } from "react-icons/fa";
import { MdGroup, MdDelete } from 'react-icons/md'
export default function ListCompetitions() {
  const competitions = trpc.competitions.getAll.useQuery();

  return (
    <Container maxW="container.md">
      <Stack py={4} divider={<Divider />} spacing={3}>
        <Flex justifyContent={"space-between"}>
          <Heading size={"lg"} fontWeight={"semibold"}>
            Competitions
          </Heading>
          <IconButton
            as={Link}
            to="/admin/competitions/create"
            aria-label="Create Competition"
            icon={<FaPlus />}
          />
        </Flex>
        <SimpleGrid columns={!competitions.data?.length ? 1 : 3} spacing={3}>
          {competitions.data?.length ? (
            competitions.data?.map((competition) => (
              <CompetitionCard key={competition.id} {...competition} />
            ))
          ) : (
            <Heading
              fontWeight={"semibold"}
              size="md"
              textAlign={"center"}
              m={8}
            >
              No Competitions
            </Heading>
          )}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}

type CompetitionCardProps = Competition;

function CompetitionCard(props: CompetitionCardProps) {
  const { colorMode } = useColorMode();
  const context = trpc.useContext()
  const deleteCompetition = trpc.competitions.deleteCompetition.useMutation({
    onSuccess: () => {
      context.competitions.getAll.invalidate()
    }
  });
  return (
    <Box
      borderRadius={"md"}
      borderWidth={"1px"}
      borderColor={colorMode === "light" ? "gray.200" : "gray.600"}
      p={2}
    >
      <Stack spacing={2}>
        <Tag
        justifyContent={"center"}
          colorScheme={
            props.status === "Pending"
              ? "yellow"
              : props.status === "Active"
              ? "blue"
              : "green"
          }
        >
          {props.status}
        </Tag>
        <Heading size={"md"} fontWeight={"semibold"} textAlign={"center"}>
          {props.name}
        </Heading>
        <ButtonGroup size="md" justifyContent={"center"}>
          <IconButton icon={<MdGroup />} as={Link} aria-label="Teams" to={`/admin/teams?competitionId=${props.id}`}/>
          <IconButton icon={<MdDelete />} aria-label="Delete" onClick={() => {
            deleteCompetition.mutate(props.id)
          }} isLoading={deleteCompetition.isLoading}/>
        </ButtonGroup>
      </Stack>
    </Box>
  );
}
