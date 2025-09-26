"use client";

interface ProjectOption {
  id: string;
  name: string;
  slug: string;
}

interface ProjectSelectProps {
  projects: ProjectOption[];
  name: string;
  defaultValue?: string;
  allowAll?: boolean;
}

export function ProjectSelect({ projects, name, defaultValue, allowAll = true }: ProjectSelectProps) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? (allowAll ? "" : projects[0]?.id)}
      className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      {allowAll ? <option value="">All Projects</option> : null}
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  );
}
