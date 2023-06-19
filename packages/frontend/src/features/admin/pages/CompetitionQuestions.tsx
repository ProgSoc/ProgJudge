import { Button, Container, Heading, Stack } from "@chakra-ui/react"
import { Link, LoaderFunctionArgs, useLoaderData } from "react-router-dom"
import { trpc } from "../../../utils/trpc"
import { z } from "zod"

export async function loader({params}: LoaderFunctionArgs) {
    const id = await z.string().uuid().parseAsync(params.competitionId)
    return id
}

export function Component () {
    const competitionId = useLoaderData() as string
    const competition = trpc.competitions.getAdminCompetitionDetails.useQuery(competitionId)
    const questions = trpc.questions.getCompetitionQuestions.useQuery(competitionId)

    return <Container>
        <Heading>{competition.data?.name ?? "Loading"} Questions</Heading>
        <Button as={Link} to={`/admin/competitions/${competitionId}/questions/create`}>Add Questions</Button>
        <Stack>
            {questions.data?.map((question) => (
                <Stack key={question.id}>
                    <Heading>{question.title}</Heading>
                    <Heading size="sm">{question.question}</Heading>
                </Stack>
            ))}
        </Stack>
    </Container>
}