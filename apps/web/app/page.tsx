import { getProjects } from "./data";
import { CheckInCard } from "../components/checkin-card";
import { PlanIngestCard } from "../components/plan-ingest-card";
import { LookAheadCard } from "../components/lookahead-card";
import { ElementQueryCard } from "../components/element-query-card";
import { OperationsCard } from "../components/operations-card";

export default async function DashboardPage() {
  const { projects } = await getProjects();

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CheckInCard />
        <PlanIngestCard projects={projects} />
      </section>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <LookAheadCard projects={projects} />
        <ElementQueryCard projects={projects} />
      </section>
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <OperationsCard />
      </section>
    </div>
  );
}
