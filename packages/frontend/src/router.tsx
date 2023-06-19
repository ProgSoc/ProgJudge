import { createBrowserRouter } from "react-router-dom";
import AdminHome from "./features/admin/pages/AdminHome";
import CreateCompetition from "./features/admin/pages/CreateCompetition";
import ListCompetitions from "./features/admin/pages/ListCompetitions";
import DefaultLayout from "./layouts/DefaultLayout";
import AdminLayout from "./layouts/AdminLayout";

const router = createBrowserRouter([
  {
    element: <DefaultLayout />,
    children: [
      { index: true, lazy: () => import("./pages/HomePage") },
      {
        path: "admin",
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminHome />,
          },
          {
            path: "competitions",
            children: [
              {
                index: true,
                element: <ListCompetitions />,
              },
              {
                path: "create",
                element: <CreateCompetition />,
              },
              {
                path: ":competitionId",
                children: [
                  {
                    index: true,
                    lazy: () =>
                      import("./features/admin/pages/CompetitionDetails"),
                  },
                  {
                    path: "questions",
                    children: [
                      {
                        index: true,
                        lazy: () =>
                          import("./features/admin/pages/CompetitionQuestions"),
                      },
                      {
                        path: "create",
                        lazy: () =>
                          import(
                            "./features/admin/pages/CreateCompetitionQuestion"
                          ),
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            path: "teams",
            children: [
              {
                index: true,
                lazy: () => import("./features/admin/pages/CompetitionTeams"),
              },
              {
                path: "create",
                lazy: () =>
                  import("./features/admin/pages/CreateCompetitionTeam"),
              },
              {
                path: ":teamId",
                lazy: () => import("./features/admin/pages/TeamDetails"),
              },
            ],
          },
        ],
      },
      {
        path: "login",
        lazy: () => import("./features/auth/pages/Login"),
      },
    ],
  },
]);

export default router;
