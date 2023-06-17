import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "./utils/trpc";
import { httpBatchLink } from "@trpc/client";
import type { PistonPackageResult } from "../../backend/src/libs/piston/piston";

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <PackageList />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;

export function PackageList () {
  const { data} = trpc.piston.getPackages.useQuery();

  const languageGroups = data?.reduce((acc, pkg) => {
    if (!acc[pkg.language]) {
      acc[pkg.language] = [];
    }
    acc[pkg.language].push(pkg);
    return acc;
  }, {} as Record<string, PistonPackageResult[]>);


  return (<>
    {Object.entries(languageGroups ?? {}).map(([language, packages]) => (
      <div key={language}>
        <h1>{language}</h1>
        <ul>
          {packages.map((pkg) => (
            <li key={pkg.language_version}>
              <a href={`/package/${pkg.language}`}>{pkg.language_version}</a>
              <input type={"checkbox"} checked={pkg.installed} />
            </li>
          ))}
        </ul>
      </div>
    ))}
  </>)
}