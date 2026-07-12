import { nodes } from "@/lib/content/resume";
import ProjectCard from "./ProjectCard";
import AblationSwitch from "./AblationSwitch";

export default function NodeGraph() {
  return (
    <section className="mx-auto max-w-4xl py-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {nodes.map((node) => (
          <div key={node.id} className="flex flex-col">
            <ProjectCard node={node} />
            <AblationSwitch nodeId={node.id} />
          </div>
        ))}
      </div>
    </section>
  );
}
