import {
  Stack,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Box,
  useColorMode,
} from "@chakra-ui/react";
import { providers } from "../../../../../backend/src/db/schema";
import { trpc } from "../../../utils/trpc";

export default function InfoCard() {
  const me = trpc.auth.getMe.useQuery();
  const providers = trpc.auth.getMyConnections.useQuery();
  const { colorMode} = useColorMode()
  
  return (
    <Box borderRadius={"md"} borderWidth={"1px"} borderColor={colorMode === "light" ? "gray.200" : "gray.600"} p={2}>
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
