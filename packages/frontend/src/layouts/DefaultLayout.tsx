import { Box, Flex } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function DefaultLayout () {
    return <Flex h="full" flexDir={"column"}>
        <Navbar />
        <Box flex={1}>
            <Outlet />
        </Box>
    </Flex>
}