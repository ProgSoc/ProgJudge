import {
  Stack,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  FormHelperText,
  Button,
  useToast,
} from "@chakra-ui/react";
import { SubmitHandler } from "react-hook-form";
import { z } from "zod";
import useZodForm from "../../../hooks/useZodForm";
import { trpc } from "../../../utils/trpc";
import RegisterSchema from "../../../../../backend/src/schemas/auth/RegisterSchema";

export default function RegisterForm() {
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    register,
  } = useZodForm({
    schema: RegisterSchema,
  });

  const toast = useToast();

  const registerLocal = trpc.auth.registerLocal.useMutation({
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const onSubmit: SubmitHandler<z.infer<typeof RegisterSchema>> = (data) =>
    registerLocal.mutateAsync(data);

  return (
    <Stack as="form" onSubmit={handleSubmit(onSubmit)}>
      <FormControl isInvalid={!!errors.username}>
        <FormLabel>Username</FormLabel>
        <Input {...register("username")} />
        {errors.username ? (
          <FormErrorMessage>{errors.username.message}</FormErrorMessage>
        ) : (
          <FormHelperText>Your username</FormHelperText>
        )}
      </FormControl>
      <FormControl isInvalid={!!errors.password}>
        <FormLabel>Password</FormLabel>
        <Input type="password" {...register("password")} />
        {errors.password ? (
          <FormErrorMessage>{errors.password.message}</FormErrorMessage>
        ) : (
          <FormHelperText>Your password</FormHelperText>
        )}
      </FormControl>
      <FormControl isInvalid={!!errors.confirmPassword}>
        <FormLabel>Password</FormLabel>
        <Input type="password" {...register("confirmPassword")} />
        {errors.confirmPassword ? (
          <FormErrorMessage>{errors.confirmPassword.message}</FormErrorMessage>
        ) : (
          <FormHelperText>Confirm your password</FormHelperText>
        )}
      </FormControl>
      <Button type="submit" isLoading={isSubmitting}>
        Register
      </Button>
    </Stack>
  );
}
