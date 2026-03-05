interface ResourceLink {
  title: string;
  description: string;
  url: string;
  category: string;
}

const RESOURCES: ResourceLink[] = [
  // Courses
  {
    title: "Prompt Engineering Interactive Tutorial",
    description: "Free course covering prompting techniques, from basics to advanced",
    url: "https://github.com/anthropics/courses/tree/master/prompt_engineering_interactive_tutorial",
    category: "Courses",
  },
  {
    title: "Real World Prompting",
    description: "Practical prompting strategies for production use cases",
    url: "https://github.com/anthropics/courses/tree/master/real_world_prompting",
    category: "Courses",
  },
  {
    title: "Prompt Evaluations",
    description: "Learn to evaluate and iterate on prompts systematically",
    url: "https://github.com/anthropics/courses/tree/master/prompt_evaluations",
    category: "Courses",
  },
  {
    title: "Tool Use Course",
    description: "Build agentic workflows with Claude's tool use capabilities",
    url: "https://github.com/anthropics/courses/tree/master/tool_use",
    category: "Courses",
  },
  // Documentation
  {
    title: "Claude Documentation",
    description: "Official API docs, guides, and references",
    url: "https://docs.anthropic.com",
    category: "Documentation",
  },
  {
    title: "Claude Code Docs",
    description: "CLI tool documentation, tips, and best practices",
    url: "https://docs.anthropic.com/en/docs/claude-code",
    category: "Documentation",
  },
  {
    title: "Anthropic Cookbook",
    description: "Code examples and patterns for building with Claude",
    url: "https://github.com/anthropics/anthropic-cookbook",
    category: "Documentation",
  },
  // Tools & References
  {
    title: "Claude Model Overview",
    description: "Compare models, context windows, and capabilities",
    url: "https://docs.anthropic.com/en/docs/about-claude/models",
    category: "References",
  },
  {
    title: "Anthropic API Reference",
    description: "Full API reference for Messages, completions, and more",
    url: "https://docs.anthropic.com/en/api",
    category: "References",
  },
  {
    title: "System Prompts Guide",
    description: "Best practices for writing effective system prompts",
    url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching",
    category: "References",
  },
];

export function ResourcesPanel() {
  const categories = [...new Set(RESOURCES.map((r) => r.category))];

  const openLink = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="resources-panel">
      <h3 className="resources-panel-title">Resources</h3>
      <p className="resources-panel-subtitle">
        Learn to get the most out of Claude
      </p>

      {categories.map((category) => (
        <div key={category} className="resources-group">
          <div className="resources-group-label">{category}</div>
          {RESOURCES.filter((r) => r.category === category).map((resource) => (
            <div
              key={resource.url}
              className="resource-card"
              onClick={() => openLink(resource.url)}
            >
              <div className="resource-title">{resource.title}</div>
              <div className="resource-desc">{resource.description}</div>
              <div className="resource-link">
                {resource.url.replace("https://", "").split("/").slice(0, 2).join("/")}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
