import { LoaderFunctionArgs, useLoaderData } from "react-router-dom";
import { z } from "zod";
import { trpc } from "../../../utils/trpc";
import useZodForm from "../../../hooks/useZodForm";
import {
  AddQuestionSchema,
  CreateTeamSchema,
} from "../../../../../backend/src/schemas";
import {
  Button,
  Container,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  Stack,
} from "@chakra-ui/react";
import { SubmitHandler } from "react-hook-form";

export async function loader({ params }: LoaderFunctionArgs) {
  const id = await z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .parseAsync(params.competitionId);
  return id;
}

export function Component() {
  const competitionId = useLoaderData() as number;
  const createCompetitionTeam = trpc.teams.createTeam.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useZodForm({
    schema: CreateTeamSchema,
    defaultValues: {
      competitionId,
    },
  });

  const onSubmit: SubmitHandler<z.infer<typeof CreateTeamSchema>> = (data) =>
    createCompetitionTeam.mutateAsync(data);

  return (
    <Container maxW="container.md">
      <Stack as="form" onSubmit={handleSubmit(onSubmit)}>
        <FormControl isInvalid={!!errors.name}>
          <FormLabel>Name</FormLabel>
          <Input {...register("name")} />
          {errors.name ? (
            <FormErrorMessage>{errors.name.message}</FormErrorMessage>
          ) : (
            <FormHelperText>Name of the team</FormHelperText>
          )}
        </FormControl>

        <Button type="submit" isLoading={isSubmitting}>
          Create Team
        </Button>
      </Stack>
    </Container>
  );
}
