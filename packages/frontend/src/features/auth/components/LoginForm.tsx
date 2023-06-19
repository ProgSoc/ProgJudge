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
import LoginSchema from "../../../../../backend/src/schemas/auth/LoginSchema";
import useZodForm from "../../../hooks/useZodForm";
import { trpc } from "../../../utils/trpc";
import { useNavigate } from "react-router-dom";

export default function LoginForm() {
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    register,
  } = useZodForm({
    schema: LoginSchema,
  });

  const toast = useToast();

  const context = trpc.useContext();
  const navigate = useNavigate()

  const login = trpc.auth.loginLocal.useMutation({
    onSuccess: () => {
      context.auth.getMe.invalidate();
      navigate('/')
    },
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

  const onSubmit: SubmitHandler<z.infer<typeof LoginSchema>> = async (data) => {
    await login.mutateAsync(data);
  };

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
      <Button type="submit" isLoading={isSubmitting}>
        Login
      </Button>
    </Stack>
  );
}
