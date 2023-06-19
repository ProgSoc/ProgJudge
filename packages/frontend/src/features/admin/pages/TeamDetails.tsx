import { LoaderFunctionArgs, useLoaderData } from "react-router-dom"
import { z } from "zod"
import { trpc } from "../../../utils/trpc"
import { Container } from "@chakra-ui/react"
import { DataTable } from "../../../components/Databtable"
import { createColumnHelper } from "@tanstack/react-table"

export async function loader ({ params }: LoaderFunctionArgs) {
  const teamId = await z.string().uuid().parseAsync(params.teamId)
  return teamId
}

const teamMemberColumnHelper = createColumnHelper<{
    id: string | null;
    name: string | null;
}>()

const columns = [
    teamMemberColumnHelper.accessor("id", {
        header: "ID",

    }),
    teamMemberColumnHelper.accessor("name", {
        header: "Name",
    }),
]

export function Component () {
    const teamId = useLoaderData() as string
    const team = trpc.teams.getAdminTeam.useQuery(teamId)
    const teamMembers = trpc.teams.getAdminTeamMembers.useQuery(teamId)

    return <Container maxW="container.md">
        {team.data?.name ?? "Loading"}

        <DataTable columns={columns} data={teamMembers.data ?? []} />
    </Container>
}