import { Box, Heading, SimpleGrid, Stack, Tag, useColorMode } from "@chakra-ui/react";
import { trpc } from "../../../utils/trpc";

export default function ConnectionsCard() {
  const providers = trpc.auth.getMyConnections.useQuery();
  const { colorMode} = useColorMode()

  return (
    <Box borderRadius={"md"} borderWidth={"1px"} borderColor={colorMode === "light" ? "gray.200" : "gray.600"} p={2}>
      <Stack spacing={2}>
        <Heading size={"md"} fontWeight={"semibold"} textAlign={"center"}>
          Connections
        </Heading>
        <SimpleGrid columns={3} spacing={3}>
          {providers.data?.map((provider) => (
            <Tag
              key={provider.id}
              borderRadius={"full"}
              textAlign={"center"}
              py={2}
              justifyContent={"center"}
              colorScheme="blue"
              fontWeight={"semibold"}
            >
              {provider.name}
            </Tag>
          ))}
        </SimpleGrid>
      </Stack>
    </Box>
  );
}
