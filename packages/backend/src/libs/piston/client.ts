import env from "../../env";
import { PistonClient } from "./piston";

const pistonClient = new PistonClient({
    url: env.PISTON_API_URL,
})

export default pistonClient