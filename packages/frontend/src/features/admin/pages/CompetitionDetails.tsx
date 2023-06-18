import { LoaderFunctionArgs, useLoaderData } from "react-router-dom";
import { trpc } from "../../../utils/trpc";
import { z } from "zod";
import { Container } from "@chakra-ui/react";

export async function loader({params}: LoaderFunctionArgs) {
    const id = await z.string().regex(/^\d+$/).transform(Number).parseAsync(params.competitionId)
    return id
}

export function Component () {
    const competitionId = useLoaderData() as number

    const competition = trpc.competitions.getAdminCompetitionDetails.useQuery(competitionId)

    return (
        <Container>
            {competition.data?.name}
        </Container>
    )

}