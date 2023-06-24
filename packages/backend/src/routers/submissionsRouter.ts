import { InferModel, and, desc, eq, inArray } from "drizzle-orm";
import {
  competitions,
  questions,
  submissions,
  teamMembers,
  teams,
} from "../db/schema";
import { adminProcedure, authedProcedure, t } from "../trpc";
import { z } from "zod";
import { CreateSubmissionSchema } from "../schemas";
import { TRPCError } from "@trpc/server";
import pistonClient from "../libs/piston/client";

const submissionsRouter = t.router({});
