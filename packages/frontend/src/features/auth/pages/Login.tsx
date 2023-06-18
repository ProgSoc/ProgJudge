import { Button, Container, HStack } from "@chakra-ui/react";

export function Component () {
    return (
        <Container maxW={"container.md"}>
        <HStack py={2}>
            <Button as="a" href="/api/auth/github">Github</Button>
        </HStack>
        </Container>
    )
}