import { Button, HStack } from "@chakra-ui/react";
import { trpc } from "../../../utils/trpc";
import { FaSkull } from "react-icons/fa";

export default function ProfileButtons() {
  const context = trpc.useContext();
  const deleteAccount = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => {
      context.auth.getMe.invalidate();
    },
  });

  return (
    <HStack>
      <Button colorScheme="red" onClick={() => deleteAccount.mutateAsync()} w="full" leftIcon={<FaSkull />} rightIcon={<FaSkull />}>
        Delete account
      </Button>
    </HStack>
  );
}
