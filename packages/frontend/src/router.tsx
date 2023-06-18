import { createBrowserRouter } from "react-router-dom";
import AdminHome from "./features/admin/pages/AdminHome";

const router = createBrowserRouter([
    {
        path: "/",
        element: <AdminHome />,
    }
])

export default router;