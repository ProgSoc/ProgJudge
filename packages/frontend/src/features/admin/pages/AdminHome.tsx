import { Box, Container, Heading, ListItem, Stack, UnorderedList } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export default function AdminHome() {
  const navigate = useNavigate();
  const handleNavigate = (path: string) => () => {
    navigate(path);
  }


  return (
    <Container maxW={"container.md"}>
    <Stack>
      <Heading>Admin Home</Heading>
      <Box>
      <UnorderedList>
        <ListItem onClick={handleNavigate('/admin/competitions')}>
          Competitions
        </ListItem>
        <ListItem onClick={handleNavigate('/admin/teams')}>
          Teams
        </ListItem>
        <ListItem onClick={handleNavigate('/admin/questions')}>
          Questions
        </ListItem>
      </UnorderedList>
      </Box>
     
    </Stack>
    </Container>
  );
}