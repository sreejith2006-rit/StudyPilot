import { motion } from "framer-motion";
import { Sparkles, BookOpen, Layers, Award, Zap, Code } from "lucide-react";

// Simple Inline Parser for **bold** and `code`
export const parseInlineMarkdown = (text: string) => {
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-white tracking-wide">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 font-mono text-xs text-primary-violet">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

interface Section {
  title: string;
  blocks: string[];
}

// Parses raw markdown into H1-bounded sections and groups consecutive lines logically
const parseMarkdownToSections = (content: string): Section[] => {
  const sections: Section[] = [];
  const lines = content.split("\n");
  let currentSection: Section | null = null;
  let currentBlockType: "paragraph" | "list-unordered" | "list-ordered" | "code" | null = null;
  let currentBlock: string[] = [];

  const flushBlock = () => {
    if (currentBlock.length > 0) {
      const blockStr = currentBlock.join("\n").trim();
      if (blockStr) {
        if (currentSection) {
          currentSection.blocks.push(blockStr);
        } else {
          // Fallback section
          currentSection = { title: "Introduction", blocks: [] };
          currentSection.blocks.push(blockStr);
          sections.push(currentSection);
        }
      }
      currentBlock = [];
    }
    currentBlockType = null;
  };

  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check code block state
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        currentBlock.push(line);
        inCodeBlock = false;
        flushBlock();
      } else {
        flushBlock();
        currentBlock.push(line);
        inCodeBlock = true;
        currentBlockType = "code";
      }
      continue;
    }

    if (inCodeBlock) {
      currentBlock.push(line);
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushBlock();
      currentSection = {
        title: trimmed.replace("# ", "").trim(),
        blocks: []
      };
      sections.push(currentSection);
      continue;
    }

    if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      flushBlock();
      if (currentSection) {
        currentSection.blocks.push(line); // push heading as a single-line block
      }
      continue;
    }

    if (trimmed === "") {
      flushBlock();
      continue;
    }

    const isUnordered = trimmed.startsWith("* ") || trimmed.startsWith("- ");
    const isOrdered = /^\d+\.\s/.test(trimmed);

    if (isUnordered) {
      if (currentBlockType !== "list-unordered") {
        flushBlock();
        currentBlockType = "list-unordered";
      }
      currentBlock.push(line);
    } else if (isOrdered) {
      if (currentBlockType !== "list-ordered") {
        flushBlock();
        currentBlockType = "list-ordered";
      }
      currentBlock.push(line);
    } else {
      if (currentBlockType !== "paragraph") {
        flushBlock();
        currentBlockType = "paragraph";
      }
      currentBlock.push(line);
    }
  }
  flushBlock();

  return sections;
};

// Returns visual styling based on section headings
const getSectionTheme = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes("executive")) {
    return {
      icon: BookOpen,
      borderClass: "border-indigo-500/20 hover:border-indigo-500/40",
      bgClass: "bg-gradient-to-tr from-primary-indigo/[0.03] to-transparent",
      textGradient: "from-indigo-300 to-cyan-300",
      accentColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
    };
  }
  if (lower.includes("concept") || lower.includes("definition")) {
    return {
      icon: Sparkles,
      borderClass: "border-violet-500/20 hover:border-violet-500/40",
      bgClass: "bg-gradient-to-tr from-primary-violet/[0.03] to-transparent",
      textGradient: "from-violet-300 to-pink-300",
      accentColor: "text-violet-400 bg-violet-500/10 border-violet-500/20"
    };
  }
  if (lower.includes("breakdown") || lower.includes("detail") || lower.includes("topic")) {
    return {
      icon: Layers,
      borderClass: "border-blue-500/20 hover:border-blue-500/40",
      bgClass: "bg-gradient-to-tr from-primary-blue/[0.03] to-transparent",
      textGradient: "from-blue-300 to-indigo-300",
      accentColor: "text-blue-400 bg-blue-500/10 border-blue-500/20"
    };
  }
  if (lower.includes("plan") || lower.includes("next step") || lower.includes("action")) {
    return {
      icon: Award,
      borderClass: "border-emerald-500/20 hover:border-emerald-500/40",
      bgClass: "bg-gradient-to-tr from-emerald-500/[0.03] to-transparent",
      textGradient: "from-emerald-300 to-teal-300",
      accentColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    };
  }
  return {
    icon: Zap,
    borderClass: "border-white/5 hover:border-white/10",
    bgClass: "bg-white/[0.01]",
    textGradient: "from-white to-muted-text",
    accentColor: "text-muted-text bg-white/[0.03] border-white/5"
  };
};

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  if (!content) return null;

  const sections = parseMarkdownToSections(content);

  return (
    <div className="space-y-6">
      {sections.map((section, sIdx) => {
        const theme = getSectionTheme(section.title);
        const IconComponent = theme.icon;

        return (
          <motion.div
            key={sIdx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: sIdx * 0.08 }}
            className={`glass-panel p-6 border ${theme.borderClass} ${theme.bgClass} relative overflow-hidden transition-all duration-300`}
          >
            {/* Header Title Block */}
            <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-white/[0.06]">
              <div className={`p-2 rounded-xl border ${theme.accentColor} shrink-0`}>
                <IconComponent className="w-5 h-5" />
              </div>
              <h2 className={`text-base font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${theme.textGradient}`}>
                {section.title}
              </h2>
            </div>

            {/* Content Blocks inside Section */}
            <div className="space-y-5 text-sm leading-relaxed text-muted-text pl-1">
              {section.blocks.map((block, bIdx) => {
                const trimmed = block.trim();
                if (!trimmed) return null;

                // Code Block
                if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
                  const lines = trimmed.split("\n");
                  const code = lines.slice(1, -1).join("\n");
                  return (
                    <div key={bIdx} className="relative rounded-xl border border-white/5 overflow-hidden my-3 bg-black/30">
                      <div className="flex items-center justify-between px-4 py-1.5 bg-white/[0.02] border-b border-white/5 text-[10px] text-muted-text font-mono font-bold">
                        <span>CODE SNIPPET</span>
                        <Code className="w-3 h-3 text-primary-violet" />
                      </div>
                      <pre className="p-4 overflow-x-auto font-mono text-xs text-primary-violet select-all">
                        <code>{code}</code>
                      </pre>
                    </div>
                  );
                }

                // H2 Subheading
                if (trimmed.startsWith("## ")) {
                  return (
                    <div key={bIdx} className="flex items-center gap-2 mt-6 mb-3 border-l-2 border-primary-indigo pl-3">
                      <h3 className="text-sm font-extrabold text-white">
                        {parseInlineMarkdown(trimmed.replace("## ", ""))}
                      </h3>
                    </div>
                  );
                }

                // H3 Subheading
                if (trimmed.startsWith("### ")) {
                  return (
                    <h4 key={bIdx} className="text-xs font-bold text-white mt-5 mb-2 tracking-wide uppercase">
                      {parseInlineMarkdown(trimmed.replace("### ", ""))}
                    </h4>
                  );
                }

                // Unordered List
                if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.includes("\n* ") || trimmed.includes("\n- ")) {
                  const lines = trimmed.split("\n");
                  return (
                    <ul key={bIdx} className="space-y-3.5 my-3 pl-1">
                      {lines.map((line, lIdx) => {
                        const cleanLine = line.replace(/^[\*\-\s]+/, "");
                        if (!cleanLine.trim()) return null;
                        return (
                          <li key={lIdx} className="flex items-start gap-2.5 text-muted-text text-sm">
                            {/* Glowing custom bullet point */}
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-indigo mt-2 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                            <span className="leading-relaxed">
                              {parseInlineMarkdown(cleanLine)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  );
                }

                // Numbered List
                if (/^\d+\.\s/.test(trimmed) || /\n\d+\.\s/.test(trimmed)) {
                  const lines = trimmed.split("\n");
                  return (
                    <ol key={bIdx} className="space-y-3.5 my-3 pl-1">
                      {lines.map((line, lIdx) => {
                        const cleanLine = line.replace(/^\d+\.\s+/, "");
                        if (!cleanLine.trim()) return null;
                        return (
                          <li key={lIdx} className="flex items-start gap-3 text-muted-text text-sm">
                            {/* Styled numeric bullet point */}
                            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/[0.04] border border-white/10 text-[10px] text-white font-bold shrink-0 mt-0.5">
                              {lIdx + 1}
                            </span>
                            <span className="leading-relaxed">
                              {parseInlineMarkdown(cleanLine)}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  );
                }

                // Regular Paragraph
                return (
                  <p key={bIdx} className="text-muted-text text-sm leading-relaxed mb-4">
                    {parseInlineMarkdown(trimmed)}
                  </p>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default MarkdownRenderer;
