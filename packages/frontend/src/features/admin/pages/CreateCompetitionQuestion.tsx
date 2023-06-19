import { LoaderFunctionArgs, useLoaderData } from "react-router-dom";
import { z } from "zod";
import { trpc } from "../../../utils/trpc";
import useZodForm from "../../../hooks/useZodForm";
import { AddQuestionSchema } from "../../../../../backend/src/schemas";
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
    .string().uuid()
    .parseAsync(params.competitionId);
  return id;
}

export function Component() {
  const competitionId = useLoaderData() as string;
  const createCompetitionQuestion =
    trpc.questions.addCompetitionQuestion.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useZodForm({
    schema: AddQuestionSchema,
    defaultValues: {
      competitionId,
    },
  });

  const onSubmit: SubmitHandler<z.infer<typeof AddQuestionSchema>> = (data) =>
    createCompetitionQuestion.mutateAsync(data);

  return (
    <Container>
      <Stack as="form" onSubmit={handleSubmit(onSubmit)}>
        <FormControl isInvalid={!!errors.title}>
          <FormLabel>Title</FormLabel>
          <Input {...register("title")} />
          {errors.title ? (
            <FormErrorMessage>{errors.title.message}</FormErrorMessage>
          ) : (
            <FormHelperText>Name of the competition</FormHelperText>
          )}
        </FormControl>
        <FormControl isInvalid={!!errors.question}>
          <FormLabel>Question</FormLabel>
          <Input {...register("question")} />
          {errors.question ? (
            <FormErrorMessage>{errors.question.message}</FormErrorMessage>
          ) : (
            <FormHelperText>Question</FormHelperText>
          )}
        </FormControl>
        <FormControl isInvalid={!!errors.stdout}>
          <FormLabel>Answer</FormLabel>
          <Input {...register("stdout")} />
          {errors.stdout ? (
            <FormErrorMessage>{errors.stdout.message}</FormErrorMessage>
          ) : (
            <FormHelperText>Expected Output</FormHelperText>
          )}
        </FormControl>
        <FormControl isInvalid={!!errors.stdin}>
          <FormLabel>Input</FormLabel>
          <Input {...register("stdin")} />
          {errors.stdin ? (
            <FormErrorMessage>{errors.stdin.message}</FormErrorMessage>
          ) : (
            <FormHelperText>Input</FormHelperText>
          )}
        </FormControl>
        <FormControl isInvalid={!!errors.points}>
          <FormLabel>Points</FormLabel>
          <Input
            {...register("points", {
              valueAsNumber: true,
            })}
          />
          {errors.points ? (
            <FormErrorMessage>{errors.points.message}</FormErrorMessage>
          ) : (
            <FormHelperText>Points</FormHelperText>
          )}
        </FormControl>
        <Button type="submit" isLoading={isSubmitting}>
            Create Question
        </Button>
      </Stack>
    </Container>
  );
}
