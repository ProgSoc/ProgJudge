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
import { CreateCompetitionSchema } from "../../../../../backend/src/schemas";
import useZodForm from "../../../hooks/useZodForm";
import { z } from "zod";
import { SubmitHandler } from "react-hook-form";
import { trpc } from "../../../utils/trpc";

export default function CreateCompetition() {
  const createCompetition = trpc.competitions.create.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useZodForm({
    schema: CreateCompetitionSchema,
    defaultValues: {
      languages: ["rust", "python"],
      description: "test",
      name: "test",
      start: new Date().toISOString(),
      end: new Date().toISOString(),
    }
  });

  const onSubmit: SubmitHandler<z.infer<typeof CreateCompetitionSchema>> = (
    data
  ) => createCompetition.mutateAsync(data);

  return (
    <Container>
      <Stack as={"form"} onSubmit={handleSubmit(onSubmit)}>
        {/* <FormControl isInvalid={!!errors.name}>
          <FormLabel>Name</FormLabel>
          <Input {...register("name")} />
          {errors.name ? (
            <FormErrorMessage>{errors.name.message}</FormErrorMessage>
          ) : (
            <FormHelperText>Name of the competition</FormHelperText>
          )}
        </FormControl>
        <FormControl isInvalid={!!errors.description}>
          <FormLabel>Description</FormLabel>
          <Input {...register("description")} />
          {errors.description ? (
            <FormErrorMessage>{errors.description.message}</FormErrorMessage>
          ) : (
            <FormHelperText>Description of the competition</FormHelperText>
          )}
        </FormControl> */}
        {/* <FormControl isInvalid={!!errors.languages}>
          <FormLabel>Languages</FormLabel>
          <Input
            {...register("languages", {
            })}
          />
          {errors.languages ? (
            <FormErrorMessage>{errors.languages.message}</FormErrorMessage>
          ) : (
            <FormHelperText>Comma separated list of languages</FormHelperText>
          )}
        </FormControl> */}
        {/* <FormControl isInvalid={!!errors.start}>
          <FormLabel>Start</FormLabel>
          <Input
            type="datetime-local"
            {...register("start", {
                setValueAs: (value: string) => new Date(value).toISOString()
            })}
          />
          {errors.start ? (
            <FormErrorMessage>{errors.start.message}</FormErrorMessage>
          ) : (
            <FormHelperText>Start date of the competition</FormHelperText>
          )}
        </FormControl>
        <FormControl isInvalid={!!errors.end}>
          <FormLabel>End</FormLabel>
          <Input
            type="datetime-local"
            {...register("end", {
            //   valueAsDate: true,
            setValueAs: (value: string) => new Date(value).toISOString()
            })}
          />
          {errors.end ? (
            <FormErrorMessage>{errors.end.message}</FormErrorMessage>
          ) : (
            <FormHelperText>End date of the competition</FormHelperText>
          )}
        </FormControl> */}

        <Button type={"submit"} isLoading={isSubmitting}>
          Submit
        </Button>
      </Stack>
    </Container>
  );
}
