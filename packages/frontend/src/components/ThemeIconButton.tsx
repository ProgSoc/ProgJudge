import { IconButton, useColorMode } from "@chakra-ui/react";
import { FaSun, FaMoon } from "react-icons/fa";

export default function ThemeIconButton() {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <IconButton
      aria-label="Switch Theme"
      icon={colorMode === "light" ? <FaSun /> : <FaMoon />}
      onClick={toggleColorMode}
      borderRadius={"full"}
    />
  );
}
