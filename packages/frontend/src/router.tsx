import { createBrowserRouter } from "react-router-dom";
import AdminHome from "./features/admin/pages/AdminHome";
import CreateCompetition from "./features/admin/pages/CreateCompetition";
import ListCompetitions from "./features/admin/pages/ListCompetitions";

const router = createBrowserRouter([
    {
        path: "/",
        element: <AdminHome />,
    },
    {
        path: "/admin/competitions/create",
        element: <CreateCompetition />,
    },
    {
        path: "/admin/competitions",
        element: <ListCompetitions />
    },
    {
        path: "/admin/competitions/:competitionId",
        lazy: () => import("./features/admin/pages/CompetitionDetails")
    },
    {
        path: "/admin/competitions/:competitionId/questions",
        lazy: () => import("./features/admin/pages/CompetitionQuestions")
    },
    {
        path: "/admin/competitions/:competitionId/questions/create",
        lazy: () => import("./features/admin/pages/CreateCompetitionQuestion")
    },
])

export default router;