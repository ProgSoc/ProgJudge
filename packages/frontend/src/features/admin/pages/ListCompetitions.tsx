import { Container, Stack } from "@chakra-ui/react"
import { trpc } from "../../../utils/trpc"
import { Link } from "react-router-dom"

export default function ListCompetitions () {
    const competitions = trpc.competitions.getAll.useQuery()

    return (
        <Container>
            <Stack>
                {competitions.data?.map((competition) => (
                    <Link to={`/admin/competitions/${competition.id}`} key={competition.id}>{competition.name}</Link>
                ))}
            </Stack>
        </Container>
    )
}