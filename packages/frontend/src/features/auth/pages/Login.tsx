import {
  Button,
  Container,
  Divider,
  HStack,
  Heading,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@chakra-ui/react";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";

export function Component() {
  return (
    <Container maxW={"container.md"} py={10}>
        <Stack spacing={4} textAlign={"center"}>
            <Heading>Login/Register</Heading>
      <Stack spacing={4} divider={<Divider />}>
        <Tabs align="center">
          <TabList>
            <Tab>Sign In</Tab>
            <Tab>Sign Up</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <LoginForm />
            </TabPanel>
            <TabPanel>
              <RegisterForm />
            </TabPanel>
          </TabPanels>
        </Tabs>
        <HStack py={2} justifyContent={"center"}>
          <Button as="a" href="/api/auth/github">
            Github
          </Button>
          <Button as="a" href="/api/auth/discord">
            Discord
          </Button>
          <Button as="a" href="/api/auth/google">
            Google
          </Button>
        </HStack>
      H</Stack>
      </Stack>
    </Container>
  );
}
