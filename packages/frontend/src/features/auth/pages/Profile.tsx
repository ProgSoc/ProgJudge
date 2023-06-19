import {
  Box,
  Container,
  Divider,
  HStack,
  Heading,
  SimpleGrid,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Tag,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { trpc } from "../../../utils/trpc";
import InfoCard from "../components/InfoCard";
import ConnectionsCard from "../components/ConnectionsCard";
import TeamsCard from "../components/TeamsCard";
import ProfileButtons from "../components/ProfileButtons";

export async function loader() {
  return null;
}

export function Component() {
  return (
    <Container maxW="container.md">
      <Stack py={4} divider={<Divider />} spacing={3}>
        <Heading textAlign={"center"}>Profile</Heading>
        <InfoCard />
        <ConnectionsCard />
        <TeamsCard />
        <ProfileButtons />
      </Stack>
    </Container>
  );
}
