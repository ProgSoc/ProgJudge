import {
  Stack,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Box,
} from "@chakra-ui/react";
import { providers } from "../../../../../backend/src/db/schema";
import { trpc } from "../../../utils/trpc";

export default function InfoCard() {
  const me = trpc.auth.getMe.useQuery();
  const providers = trpc.auth.getMyConnections.useQuery();
  
  return (
    <Box borderRadius={"md"} borderWidth={"1px"} borderColor={"gray.200"} p={2}>
      <Stack spacing={2} textAlign={"center"}>
        <Heading size={"md"} fontWeight={"semibold"}>
          Your Info
        </Heading>
        <Stat>
          <StatLabel>Username</StatLabel>
          <StatNumber>{me.data?.username}</StatNumber>
          <StatHelpText>
            The username chosen from your connected
            {(providers.data?.length ?? 1) === 1 ? "account" : "accounts"}
          </StatHelpText>
        </Stat>
      </Stack>
    </Box>
  );
}
