import db from "./db/db";
import migrate from "./db/migrate";
import { competitions, questions, teams } from "./db/schema";
import env from "./env";
import { ExecutionLoop } from "./pipelines/execution";
import {
  PipelineScriptInputDestKind,
  PipelineScriptInputSourceKind,
  PipelineScriptKind,
} from "./pipelines/pipelineConfig";
import { createQuestionVersion } from "./pipelines/questions";

async function run() {
  await migrate(env.SECRET_DB_URL);

  ExecutionLoop.spawn();

  const comps = await db
    .insert(competitions)
    .values({
      name: "Test Competition",
    })
    .returning();
  const comp = comps[0];

  const qs = await db
    .insert(questions)
    .values({
      name: "Test Question",
      displayName: "Test Question",
      competitionId: comp.id,
      description: "Test Question",
    })
    .returning();
  const question = qs[0];

  await createQuestionVersion(
    {
      testCases: [
        {
          name: "test",
          displayName: "Test Case",
          file: {
            data: Buffer.from("foo bar\n"),
            filename: "test.txt",
            mime: "text/plain",
          },
          hidden: false,
        },
      ],
      pipeline: {
        outputNode: "last",
        nodes: {
          echo: {
            inputs: [
              {
                source: { kind: PipelineScriptInputSourceKind.TestCase },
                destination: { kind: PipelineScriptInputDestKind.Stdin },
              },
            ],
            output: "utf8",
            script: {
              kind: PipelineScriptKind.Script,
              scriptName: "echo",
            },
          },
          echo2: {
            inputs: [
              {
                source: { kind: PipelineScriptInputSourceKind.TestCase },
                // source: {
                //   kind: PipelineScriptInputSourceKind.Stdout,
                //   sourceScriptName: "echo",
                // },
                destination: { kind: PipelineScriptInputDestKind.Stdin },
              },
            ],
            output: "utf8",
            script: {
              kind: PipelineScriptKind.Script,
              scriptName: "echo2",
            },
          },
          echo3: {
            inputs: [
              {
                source: {
                  kind: PipelineScriptInputSourceKind.Stdout,
                  sourceScriptName: "echo2",
                },
                destination: {
                  kind: PipelineScriptInputDestKind.File,
                  path: "file2.rs",
                },
              },
              {
                source: {
                  kind: PipelineScriptInputSourceKind.Stdout,
                  sourceScriptName: "echo",
                },
                destination: {
                  kind: PipelineScriptInputDestKind.File,
                  path: "file1.rs",
                },
              },
            ],
            output: "utf8",
            script: {
              kind: PipelineScriptKind.Script,
              scriptName: "echo3",
            },
          },
        },
        scripts: {
          echo: {
            runtime: "dotnet/csharp:5.0.201",
            data: Buffer.from(`
using System;

public class Program
{
    public static void Main()
    {
        Console.WriteLine(@"

pub fn print_test() {
    println!(""Hello from imported rust file"");
}

        ");
    }
}
            `),
            filename: "echo.cs",
          },
          echo2: {
            runtime: "python:3.10.0",
            data: Buffer.from(`
print('foo')
            `),
            filename: "echo.py",
          },
          echo3: {
            runtime: "rust:1.68.2",
            data: Buffer.from(`
use std::io::{self, Read};

#[path="file1.rs"]
mod file1;

fn main() {
  file1::print_test();
}
            `),
            filename: "echo.rs",
          },
        },
      },
    },
    question.id
  );

  console.log("done");

  // const ts = await db
  //   .insert(teams)
  //   .values({
  //     name: "Test Team",
  //     displayName: "Test Team",
  //     competitionId: comp.id,
  //   })
  //   .returning();
  // const team = ts[0];
}

run();

// {
//   language: 'python',
//   version: '3.10.0',
//   run: {
//     stdout: '',
//     stderr: 'Traceback (most recent call last):\n' +
//       '  File "/piston/jobs/4b08d3d5-17cc-41a5-bf09-62d0e1e051ab/echo.py", line 1, in <module>\n' +
//       '    data = input()\n' +
//       'EOFError: EOF when reading a line\n',
//     code: 1,
//     signal: null,
//     output: 'Traceback (most recent call last):\n' +
//       '  File "/piston/jobs/4b08d3d5-17cc-41a5-bf09-62d0e1e051ab/echo.py", line 1, in <module>\n' +
//       '    data = input()\n' +
//       'EOFError: EOF when reading a line\n'
//   }
// }

// {
//   language: 'python',
//   version: '3.10.0',
//   run: {
//     stdout: 'foo bar\n',
//     stderr: '',
//     code: 0,
//     signal: null,
//     output: 'foo bar\n'
//   }
// }

// {
//   language: 'rust',
//   version: '1.68.2',
//   run: {
//     stdout: 'foo bar\n',
//     stderr: '',
//     code: 0,
//     signal: null,
//     output: 'foo bar\n'
//   },
//   compile: { stdout: '', stderr: '', code: 0, signal: null, output: '' }
// }

// {
//   language: 'rust',
//   version: '1.68.2',
//   run: {
//     stdout: '',
//     stderr: '/piston/packages/rust/1.68.2/run: line 4: ./binary: No such file or directory\n',
//     code: 127,
//     signal: null,
//     output: '/piston/packages/rust/1.68.2/run: line 4: ./binary: No such file or directory\n'
//   },
//   compile: {
//     stdout: '',
//     stderr: 'error: expected one of `->`, `where`, or `{`, found `b`\n' +
//       ' --> echo.rs:4:10\n' +
//       '  |\n' +
//       '4 | fn main()b {\n' +
//       '  |          ^ expected one of `->`, `where`, or `{`\n' +
//       '\n' +
//       'error: aborting due to previous error\n' +
//       '\n' +
//       "chmod: cannot access 'binary': No such file or directory\n",
//     code: 1,
//     signal: null,
//     output: 'error: expected one of `->`, `where`, or `{`, found `b`\n' +
//       ' --> echo.rs:4:10\n' +
//       '  |\n' +
//       '4 | fn main()b {\n' +
//       '  |          ^ expected one of `->`, `where`, or `{`\n' +
//       '\n' +
//       'error: aborting due to previous error\n' +
//       '\n' +
//       "chmod: cannot access 'binary': No such file or directory\n"
//   }
// }
